import fs from "node:fs";
import path from "node:path";
import { REPORTES_EJEMPLO } from "./ejemplos";
import {
  COLUMNA_TELEFONO_HASH,
  META_PRIVACIDAD,
  SENTENCIAS_INDICES,
  SENTENCIAS_LIMPIEZA,
  SENTENCIAS_TABLAS,
} from "./esquema";
import { contarEnVentana, DIA_MS, excedeLimite } from "./limite";
import { hashTelefono, RETENCION_DIAS, validarSecretos } from "./privacidad";

export type ModoAlmacen = "sqlite" | "turso" | "memoria";

export interface FilaReporte {
  tipo: string;
  creado_en: string;
  es_ejemplo: number;
}

export interface Conteos {
  total: number;
  numerosDistintos: number;
  ultimos7dias: number;
  ejemplos: number;
  porTipo: { tipo: string; n: number }[];
}

export interface Guardado {
  telefonoHash: string;
  tipo: string;
  descripcion: string;
  creadoEn: string;
}

export interface ConsumoLimite {
  accion: string;
  clave: string;
  maximo: number;
  ventanaMs: number;
  ahora: Date;
}

export interface ResultadoLimite {
  permitido: boolean;
  reintentarEnSeg: number;
}

export interface CortesPurga {
  reportesAntesDe: string;
  eventosAntesDe: string;
}

export interface Almacen {
  modo: ModoAlmacen;
  reportesDe(telefonoHash: string): Promise<FilaReporte[]>;
  conteos(desdeIso: string): Promise<Conteos>;
  guardar(entrada: Guardado): Promise<number>;
  /**
   * Anota un uso y dice si cabía en el límite. Solo se anotan los usos permitidos:
   * insistir con la puerta cerrada no alarga la espera. Es atómico en SQLite y en Turso.
   */
  consumirLimite(entrada: ConsumoLimite): Promise<ResultadoLimite>;
  /** Borra reportes vencidos (menos los de demostración) y usos de límite viejos. Devuelve los reportes borrados. */
  purgar(cortes: CortesPurga): Promise<number>;
  cerrar(): void;
}

interface FilaSemilla {
  telefonoHash: string;
  tipo: string;
  descripcion: string;
  creadoEn: string;
}

function filasSemilla(ahora = Date.now()): FilaSemilla[] {
  return REPORTES_EJEMPLO.map((reporte) => ({
    telefonoHash: hashTelefono(reporte.telefono),
    tipo: reporte.tipo,
    descripcion: reporte.descripcion,
    creadoEn: new Date(ahora - reporte.diasAtras * 86_400_000).toISOString(),
  }));
}

function conteosDe(
  filas: { telefonoHash: string; tipo: string; creadoEn: string; esEjemplo: boolean }[],
  desdeIso: string,
): Conteos {
  const porTipo = new Map<string, number>();
  const numeros = new Set<string>();
  let ejemplos = 0;
  let ultimos7dias = 0;
  for (const fila of filas) {
    numeros.add(fila.telefonoHash);
    porTipo.set(fila.tipo, (porTipo.get(fila.tipo) ?? 0) + 1);
    if (fila.esEjemplo) ejemplos += 1;
    if (fila.creadoEn >= desdeIso) ultimos7dias += 1;
  }
  return {
    total: filas.length,
    numerosDistintos: numeros.size,
    ultimos7dias,
    ejemplos,
    porTipo: [...porTipo.entries()].map(([tipo, n]) => ({ tipo, n })),
  };
}

function desdeDe(ahora: Date, ventanaMs: number): string {
  return new Date(ahora.getTime() - ventanaMs).toISOString();
}

/** Segundos hasta que el uso más viejo de la ventana salga de ella y se libere un lugar. */
function reintentarEn(masAntiguaIso: string | null | undefined, ventanaMs: number, ahora: Date): number {
  if (!masAntiguaIso) return 1;
  const libre = new Date(masAntiguaIso).getTime() + ventanaMs;
  if (!Number.isFinite(libre)) return 1;
  return Math.max(1, Math.ceil((libre - ahora.getTime()) / 1000));
}

export function cortesDePurga(ahora: Date): CortesPurga {
  return {
    reportesAntesDe: new Date(ahora.getTime() - RETENCION_DIAS * DIA_MS).toISOString(),
    eventosAntesDe: new Date(ahora.getTime() - 2 * DIA_MS).toISOString(),
  };
}

const INTERVALO_PURGA_MS = 60 * 60 * 1000;
const ultimaPurga = new WeakMap<Almacen, number>();

/**
 * No hay tarea programada en Vercel, así que el borrado ocurre cuando la app se usa:
 * como mucho una vez por hora por instancia, y siempre en la primera consulta tras arrancar.
 * Un fallo al borrar se registra pero no tumba la consulta ni el reporte.
 */
export async function purgarSiToca(almacen: Almacen, ahora: Date): Promise<void> {
  const previa = ultimaPurga.get(almacen);
  if (previa !== undefined && ahora.getTime() - previa < INTERVALO_PURGA_MS) return;
  ultimaPurga.set(almacen, ahora.getTime());
  try {
    await almacen.purgar(cortesDePurga(ahora));
  } catch (error) {
    console.error("No pude borrar los reportes vencidos.", error);
  }
}

/** Pasos de la migración que son iguales en SQLite y en Turso; cada uno aporta solo su adaptador. */
export interface EjecutorMigracion {
  meta(clave: string): Promise<string | null>;
  fijarMeta(clave: string, valor: string): Promise<void>;
  columnas(): Promise<string[]>;
  ejecutar(sql: string): Promise<void>;
  filasSinHash(): Promise<{ id: number; telefono: string }[]>;
  guardarHashes(lote: { id: number; hash: string }[]): Promise<void>;
}

/**
 * Pasa una base vieja (teléfonos e IP en claro) al esquema nuevo: calcula el HMAC de cada
 * teléfono, deja la columna heredada vacía y borra el hash de IP de los reportes.
 * Devuelve true si tuvo que reescribir filas. Es idempotente.
 */
export async function migrarPrivacidad(ej: EjecutorMigracion): Promise<boolean> {
  if ((await ej.meta(META_PRIVACIDAD)) === "1") return false;

  if (!(await ej.columnas()).includes("telefono_hash")) {
    try {
      await ej.ejecutar(COLUMNA_TELEFONO_HASH);
    } catch (error) {
      // Otra instancia pudo agregarla justo antes. Si sigue sin existir, el error es real.
      if (!(await ej.columnas()).includes("telefono_hash")) throw error;
    }
  }

  const pendientes = await ej.filasSinHash();
  for (let inicio = 0; inicio < pendientes.length; inicio += 200) {
    const lote = pendientes.slice(inicio, inicio + 200);
    await ej.guardarHashes(lote.map((fila) => ({ id: fila.id, hash: hashTelefono(fila.telefono) })));
  }
  await ej.ejecutar(`UPDATE reportes SET ip_hash = NULL WHERE ip_hash IS NOT NULL`);
  await ej.fijarMeta(META_PRIVACIDAD, "1");
  return pendientes.length > 0;
}

export function crearAlmacenMemoria(ahora = Date.now()): Almacen {
  const reportes: {
    id: number;
    telefonoHash: string;
    tipo: string;
    descripcion: string;
    creadoEn: string;
    esEjemplo: boolean;
  }[] = [];
  const eventos: { accion: string; clave: string; creadoEn: string }[] = [];
  let siguiente = 1;
  for (const fila of filasSemilla(ahora)) {
    reportes.push({
      id: siguiente,
      telefonoHash: fila.telefonoHash,
      tipo: fila.tipo,
      descripcion: fila.descripcion,
      creadoEn: fila.creadoEn,
      esEjemplo: true,
    });
    siguiente += 1;
  }

  return {
    modo: "memoria",
    async reportesDe(telefonoHash) {
      return reportes
        .filter((fila) => fila.telefonoHash === telefonoHash)
        .map((fila) => ({
          tipo: fila.tipo,
          creado_en: fila.creadoEn,
          es_ejemplo: fila.esEjemplo ? 1 : 0,
        }));
    },
    async conteos(desdeIso) {
      return conteosDe(reportes, desdeIso);
    },
    async guardar(entrada) {
      const id = siguiente;
      siguiente += 1;
      reportes.push({
        id,
        telefonoHash: entrada.telefonoHash,
        tipo: entrada.tipo,
        descripcion: entrada.descripcion,
        creadoEn: entrada.creadoEn,
        esEjemplo: false,
      });
      return id;
    },
    async consumirLimite({ accion, clave, maximo, ventanaMs, ahora: instante }) {
      const desde = desdeDe(instante, ventanaMs);
      for (let indice = eventos.length - 1; indice >= 0; indice -= 1) {
        const evento = eventos[indice];
        if (evento && evento.accion === accion && evento.clave === clave && evento.creadoEn < desde) {
          eventos.splice(indice, 1);
        }
      }
      const marcas = eventos
        .filter((evento) => evento.accion === accion && evento.clave === clave)
        .map((evento) => evento.creadoEn)
        .sort();
      if (excedeLimite(contarEnVentana(marcas, instante, ventanaMs), maximo)) {
        return { permitido: false, reintentarEnSeg: reintentarEn(marcas[0], ventanaMs, instante) };
      }
      eventos.push({ accion, clave, creadoEn: instante.toISOString() });
      return { permitido: true, reintentarEnSeg: 0 };
    },
    async purgar({ reportesAntesDe, eventosAntesDe }) {
      let borrados = 0;
      for (let indice = reportes.length - 1; indice >= 0; indice -= 1) {
        const fila = reportes[indice];
        if (fila && !fila.esEjemplo && fila.creadoEn < reportesAntesDe) {
          reportes.splice(indice, 1);
          borrados += 1;
        }
      }
      for (let indice = eventos.length - 1; indice >= 0; indice -= 1) {
        const evento = eventos[indice];
        if (evento && evento.creadoEn < eventosAntesDe) eventos.splice(indice, 1);
      }
      return borrados;
    },
    cerrar() {},
  };
}

type DatabaseSync = import("node:sqlite").DatabaseSync;

function sembrarSqlite(db: DatabaseSync, ahora = Date.now()) {
  const existente = db.prepare(`SELECT valor FROM meta WHERE clave = 'semilla'`).get() as
    | { valor: string }
    | undefined;
  if (existente) return;
  const insertar = db.prepare(
    `INSERT INTO reportes (telefono, telefono_hash, tipo, descripcion, creado_en, ip_hash, es_ejemplo)
     VALUES ('', ?, ?, ?, ?, NULL, 1)`,
  );
  db.exec("BEGIN");
  try {
    for (const fila of filasSemilla(ahora)) {
      insertar.run(fila.telefonoHash, fila.tipo, fila.descripcion, fila.creadoEn);
    }
    db.prepare(`INSERT INTO meta (clave, valor) VALUES ('semilla', '1')`).run();
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function ejecutorSqlite(db: DatabaseSync): EjecutorMigracion {
  return {
    async meta(clave) {
      const fila = db.prepare(`SELECT valor FROM meta WHERE clave = ?`).get(clave) as { valor: string } | undefined;
      return fila?.valor ?? null;
    },
    async fijarMeta(clave, valor) {
      db.prepare(
        `INSERT INTO meta (clave, valor) VALUES (?, ?) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor`,
      ).run(clave, valor);
    },
    async columnas() {
      return (db.prepare(`PRAGMA table_info(reportes)`).all() as unknown as { name: string }[]).map((c) => c.name);
    },
    async ejecutar(sql) {
      db.exec(sql);
    },
    async filasSinHash() {
      const filas = db
        .prepare(`SELECT id, telefono FROM reportes WHERE telefono_hash IS NULL AND telefono <> ''`)
        .all() as unknown as { id: number; telefono: string }[];
      return filas.map((fila) => ({ id: Number(fila.id), telefono: fila.telefono }));
    },
    async guardarHashes(lote) {
      const actualizar = db.prepare(`UPDATE reportes SET telefono_hash = ?, telefono = '' WHERE id = ?`);
      db.exec("BEGIN");
      try {
        for (const fila of lote) actualizar.run(fila.hash, fila.id);
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    },
  };
}

export async function crearAlmacenSqlite(archivo: string): Promise<Almacen> {
  const { DatabaseSync } = await import("node:sqlite");
  fs.mkdirSync(path.dirname(archivo), { recursive: true });
  const db = new DatabaseSync(archivo);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec(`${SENTENCIAS_TABLAS.join(";\n")};`);
  const reescribio = await migrarPrivacidad(ejecutorSqlite(db));
  db.exec(`${[...SENTENCIAS_INDICES, ...SENTENCIAS_LIMPIEZA].join(";\n")};`);
  if (reescribio) {
    // Sin esto, los teléfonos en claro seguirían en páginas libres y en el archivo -wal.
    db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
    db.exec("VACUUM");
  }
  sembrarSqlite(db);

  return {
    modo: "sqlite",
    async reportesDe(telefonoHash) {
      return db
        .prepare(`SELECT tipo, creado_en, es_ejemplo FROM reportes WHERE telefono_hash = ?`)
        .all(telefonoHash) as unknown as FilaReporte[];
    },
    async conteos(desdeIso) {
      const total = Number((db.prepare(`SELECT COUNT(*) AS n FROM reportes`).get() as { n: number }).n);
      const numerosDistintos = Number(
        (db.prepare(`SELECT COUNT(DISTINCT telefono_hash) AS n FROM reportes`).get() as { n: number }).n,
      );
      const ultimos7dias = Number(
        (db.prepare(`SELECT COUNT(*) AS n FROM reportes WHERE creado_en >= ?`).get(desdeIso) as { n: number }).n,
      );
      const ejemplos = Number(
        (db.prepare(`SELECT COUNT(*) AS n FROM reportes WHERE es_ejemplo = 1`).get() as { n: number }).n,
      );
      const porTipo = db.prepare(`SELECT tipo, COUNT(*) AS n FROM reportes GROUP BY tipo`).all() as unknown as {
        tipo: string;
        n: number;
      }[];
      return {
        total,
        numerosDistintos,
        ultimos7dias,
        ejemplos,
        porTipo: porTipo.map((fila) => ({ tipo: fila.tipo, n: Number(fila.n) })),
      };
    },
    async guardar(entrada) {
      const resultado = db
        .prepare(
          `INSERT INTO reportes (telefono, telefono_hash, tipo, descripcion, creado_en, ip_hash, es_ejemplo)
           VALUES ('', ?, ?, ?, ?, NULL, 0)`,
        )
        .run(entrada.telefonoHash, entrada.tipo, entrada.descripcion, entrada.creadoEn);
      return Number(resultado.lastInsertRowid);
    },
    async consumirLimite({ accion, clave, maximo, ventanaMs, ahora }) {
      const desde = desdeDe(ahora, ventanaMs);
      db.prepare(`DELETE FROM eventos_limite WHERE accion = ? AND clave = ? AND creado_en < ?`).run(
        accion,
        clave,
        desde,
      );
      const insertado = db
        .prepare(
          `INSERT INTO eventos_limite (accion, clave, creado_en)
           SELECT ?, ?, ?
           WHERE (SELECT COUNT(*) FROM eventos_limite WHERE accion = ? AND clave = ? AND creado_en >= ?) < ?`,
        )
        .run(accion, clave, ahora.toISOString(), accion, clave, desde, maximo);
      if (Number(insertado.changes) > 0) return { permitido: true, reintentarEnSeg: 0 };
      const fila = db
        .prepare(`SELECT MIN(creado_en) AS mas_antiguo FROM eventos_limite WHERE accion = ? AND clave = ? AND creado_en >= ?`)
        .get(accion, clave, desde) as { mas_antiguo: string | null } | undefined;
      return { permitido: false, reintentarEnSeg: reintentarEn(fila?.mas_antiguo, ventanaMs, ahora) };
    },
    async purgar({ reportesAntesDe, eventosAntesDe }) {
      const borrados = db
        .prepare(`DELETE FROM reportes WHERE es_ejemplo = 0 AND creado_en < ?`)
        .run(reportesAntesDe);
      db.prepare(`DELETE FROM eventos_limite WHERE creado_en < ?`).run(eventosAntesDe);
      return Number(borrados.changes);
    },
    cerrar() {
      db.close();
    },
  };
}

function celda(fila: Record<string, unknown>, clave: string): string {
  const valor = fila[clave];
  return valor == null ? "" : String(valor);
}

type ClienteTurso = Awaited<ReturnType<typeof import("@libsql/client/web").createClient>>;

function ejecutorTurso(cliente: ClienteTurso): EjecutorMigracion {
  return {
    async meta(clave) {
      const resultado = await cliente.execute({ sql: `SELECT valor FROM meta WHERE clave = ?`, args: [clave] });
      const fila = resultado.rows[0] as unknown as Record<string, unknown> | undefined;
      return fila ? celda(fila, "valor") : null;
    },
    async fijarMeta(clave, valor) {
      await cliente.execute({
        sql: `INSERT INTO meta (clave, valor) VALUES (?, ?) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor`,
        args: [clave, valor],
      });
    },
    async columnas() {
      const resultado = await cliente.execute(`PRAGMA table_info(reportes)`);
      return resultado.rows.map((fila) => celda(fila as unknown as Record<string, unknown>, "name"));
    },
    async ejecutar(sql) {
      await cliente.execute(sql);
    },
    async filasSinHash() {
      const resultado = await cliente.execute(
        `SELECT id, telefono FROM reportes WHERE telefono_hash IS NULL AND telefono <> ''`,
      );
      return resultado.rows.map((fila) => {
        const registro = fila as unknown as Record<string, unknown>;
        return { id: Number(registro.id), telefono: celda(registro, "telefono") };
      });
    },
    async guardarHashes(lote) {
      await cliente.batch(
        lote.map((fila) => ({
          sql: `UPDATE reportes SET telefono_hash = ?, telefono = '' WHERE id = ?`,
          args: [fila.hash, fila.id],
        })),
        "write",
      );
    },
  };
}

async function crearAlmacenTurso(url: string, authToken: string | undefined): Promise<Almacen> {
  const { createClient } = await import("@libsql/client/web");
  const cliente = createClient({ url, authToken });
  await cliente.executeMultiple(`${SENTENCIAS_TABLAS.join(";\n")};`);
  await migrarPrivacidad(ejecutorTurso(cliente));
  await cliente.executeMultiple(`${[...SENTENCIAS_INDICES, ...SENTENCIAS_LIMPIEZA].join(";\n")};`);
  const marca = await cliente.execute(`SELECT valor FROM meta WHERE clave = 'semilla'`);
  if (marca.rows.length === 0) {
    const inserts = filasSemilla().map((fila) => ({
      sql: `INSERT INTO reportes (telefono, telefono_hash, tipo, descripcion, creado_en, ip_hash, es_ejemplo)
            VALUES ('', ?, ?, ?, ?, NULL, 1)`,
      args: [fila.telefonoHash, fila.tipo, fila.descripcion, fila.creadoEn],
    }));
    await cliente.batch(
      [...inserts, { sql: `INSERT INTO meta (clave, valor) VALUES ('semilla', '1')`, args: [] }],
      "write",
    );
  }

  return {
    modo: "turso",
    async reportesDe(telefonoHash) {
      const resultado = await cliente.execute({
        sql: `SELECT tipo, creado_en, es_ejemplo FROM reportes WHERE telefono_hash = ?`,
        args: [telefonoHash],
      });
      return resultado.rows.map((fila) => {
        const registro = fila as unknown as Record<string, unknown>;
        return {
          tipo: celda(registro, "tipo"),
          creado_en: celda(registro, "creado_en"),
          es_ejemplo: Number(registro.es_ejemplo ?? 0),
        };
      });
    },
    async conteos(desdeIso) {
      const [total, numeros, recientes, ejemplos, tipos] = await cliente.batch(
        [
          `SELECT COUNT(*) AS n FROM reportes`,
          `SELECT COUNT(DISTINCT telefono_hash) AS n FROM reportes`,
          { sql: `SELECT COUNT(*) AS n FROM reportes WHERE creado_en >= ?`, args: [desdeIso] },
          `SELECT COUNT(*) AS n FROM reportes WHERE es_ejemplo = 1`,
          `SELECT tipo, COUNT(*) AS n FROM reportes GROUP BY tipo`,
        ],
        "read",
      );
      const n = (fila: (typeof total.rows)[number] | undefined) =>
        Number((fila as unknown as Record<string, unknown> | undefined)?.n ?? 0);
      return {
        total: n(total.rows[0]),
        numerosDistintos: n(numeros.rows[0]),
        ultimos7dias: n(recientes.rows[0]),
        ejemplos: n(ejemplos.rows[0]),
        porTipo: tipos.rows.map((fila) => {
          const registro = fila as unknown as Record<string, unknown>;
          return { tipo: celda(registro, "tipo"), n: Number(registro.n ?? 0) };
        }),
      };
    },
    async guardar(entrada) {
      const [insertado] = await cliente.batch(
        [
          {
            sql: `INSERT INTO reportes (telefono, telefono_hash, tipo, descripcion, creado_en, ip_hash, es_ejemplo)
                  VALUES ('', ?, ?, ?, ?, NULL, 0)`,
            args: [entrada.telefonoHash, entrada.tipo, entrada.descripcion, entrada.creadoEn],
          },
        ],
        "write",
      );
      return Number(insertado?.lastInsertRowid ?? 0);
    },
    async consumirLimite({ accion, clave, maximo, ventanaMs, ahora }) {
      const desde = desdeDe(ahora, ventanaMs);
      // Un solo lote es una sola transacción: el conteo y el insert no se pueden cruzar con otra petición.
      const [, insertado, masAntiguo] = await cliente.batch(
        [
          {
            sql: `DELETE FROM eventos_limite WHERE accion = ? AND clave = ? AND creado_en < ?`,
            args: [accion, clave, desde],
          },
          {
            sql: `INSERT INTO eventos_limite (accion, clave, creado_en)
                  SELECT ?, ?, ?
                  WHERE (SELECT COUNT(*) FROM eventos_limite WHERE accion = ? AND clave = ? AND creado_en >= ?) < ?`,
            args: [accion, clave, ahora.toISOString(), accion, clave, desde, maximo],
          },
          {
            sql: `SELECT MIN(creado_en) AS mas_antiguo FROM eventos_limite WHERE accion = ? AND clave = ? AND creado_en >= ?`,
            args: [accion, clave, desde],
          },
        ],
        "write",
      );
      if ((insertado?.rowsAffected ?? 0) > 0) return { permitido: true, reintentarEnSeg: 0 };
      const fila = masAntiguo?.rows[0] as unknown as Record<string, unknown> | undefined;
      const valor = fila ? celda(fila, "mas_antiguo") : "";
      return { permitido: false, reintentarEnSeg: reintentarEn(valor || null, ventanaMs, ahora) };
    },
    async purgar({ reportesAntesDe, eventosAntesDe }) {
      const [borrados] = await cliente.batch(
        [
          { sql: `DELETE FROM reportes WHERE es_ejemplo = 0 AND creado_en < ?`, args: [reportesAntesDe] },
          { sql: `DELETE FROM eventos_limite WHERE creado_en < ?`, args: [eventosAntesDe] },
        ],
        "write",
      );
      return borrados?.rowsAffected ?? 0;
    },
    cerrar() {
      cliente.close();
    },
  };
}

function rutaSqlite(): string {
  return process.env.SQLITE_PATH || path.join(process.cwd(), "data", "semaforo.sqlite");
}

const estado = globalThis as unknown as {
  semaforoAlmacen?: Promise<Almacen>;
  semaforoAlmacenFijo?: Almacen | null;
};

export function fijarAlmacenParaPruebas(almacen: Almacen | null) {
  estado.semaforoAlmacenFijo = almacen;
  estado.semaforoAlmacen = undefined;
}

async function abrir(): Promise<Almacen> {
  // Antes de cualquier try: si falta la clave en producción, que el error diga eso y no "Turso no respondió".
  validarSecretos();
  const turso = process.env.TURSO_DATABASE_URL?.trim();
  if (turso) {
    try {
      return await crearAlmacenTurso(turso, process.env.TURSO_AUTH_TOKEN?.trim() || undefined);
    } catch (error) {
      console.error("Turso no respondió. Sigo con la semilla en memoria.", error);
      return crearAlmacenMemoria();
    }
  }
  if (process.env.VERCEL && !process.env.SQLITE_PATH) {
    return crearAlmacenMemoria();
  }
  try {
    return await crearAlmacenSqlite(rutaSqlite());
  } catch (error) {
    console.error("No pude abrir SQLite. Sigo con la semilla en memoria.", error);
    return crearAlmacenMemoria();
  }
}

export function obtenerAlmacen(): Promise<Almacen> {
  if (estado.semaforoAlmacenFijo) return Promise.resolve(estado.semaforoAlmacenFijo);
  if (!estado.semaforoAlmacen) {
    estado.semaforoAlmacen = abrir().catch((error) => {
      // No dejar guardada una promesa rechazada: tras corregir la configuración se reintenta.
      estado.semaforoAlmacen = undefined;
      throw error;
    });
  }
  return estado.semaforoAlmacen;
}
