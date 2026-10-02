import fs from "node:fs";
import path from "node:path";
import { REPORTES_EJEMPLO } from "./ejemplos";
import { SENTENCIAS_ESQUEMA } from "./esquema";
import { VENTANA_MS } from "./limite";

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
  telefono: string;
  tipo: string;
  descripcion: string;
  creadoEn: string;
  ipHash: string;
  borrarLimitesAntesDe: string;
}

export interface Almacen {
  modo: ModoAlmacen;
  reportesDe(telefono: string): Promise<FilaReporte[]>;
  conteos(desdeIso: string): Promise<Conteos>;
  marcasDesde(ipHash: string, desdeIso: string): Promise<string[]>;
  guardar(entrada: Guardado): Promise<number>;
  cerrar(): void;
}

interface FilaSemilla {
  telefono: string;
  tipo: string;
  descripcion: string;
  creadoEn: string;
}

function filasSemilla(ahora = Date.now()): FilaSemilla[] {
  return REPORTES_EJEMPLO.map((reporte) => ({
    telefono: reporte.telefono,
    tipo: reporte.tipo,
    descripcion: reporte.descripcion,
    creadoEn: new Date(ahora - reporte.diasAtras * 86_400_000).toISOString(),
  }));
}

function conteosDe(filas: { telefono: string; tipo: string; creadoEn: string; esEjemplo: boolean }[], desdeIso: string): Conteos {
  const porTipo = new Map<string, number>();
  const numeros = new Set<string>();
  let ejemplos = 0;
  let ultimos7dias = 0;
  for (const fila of filas) {
    numeros.add(fila.telefono);
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

export function crearAlmacenMemoria(ahora = Date.now()): Almacen {
  const reportes: {
    id: number;
    telefono: string;
    tipo: string;
    descripcion: string;
    creadoEn: string;
    ipHash: string | null;
    esEjemplo: boolean;
  }[] = [];
  const limites: { ipHash: string; creadoEn: string }[] = [];
  let siguiente = 1;
  for (const fila of filasSemilla(ahora)) {
    reportes.push({
      id: siguiente,
      telefono: fila.telefono,
      tipo: fila.tipo,
      descripcion: fila.descripcion,
      creadoEn: fila.creadoEn,
      ipHash: null,
      esEjemplo: true,
    });
    siguiente += 1;
  }

  return {
    modo: "memoria",
    async reportesDe(telefono) {
      return reportes
        .filter((fila) => fila.telefono === telefono)
        .map((fila) => ({
          tipo: fila.tipo,
          creado_en: fila.creadoEn,
          es_ejemplo: fila.esEjemplo ? 1 : 0,
        }));
    },
    async conteos(desdeIso) {
      return conteosDe(reportes, desdeIso);
    },
    async marcasDesde(ipHash, desdeIso) {
      return limites
        .filter((marca) => marca.ipHash === ipHash && marca.creadoEn >= desdeIso)
        .map((marca) => marca.creadoEn);
    },
    async guardar(entrada) {
      const id = siguiente;
      siguiente += 1;
      reportes.push({
        id,
        telefono: entrada.telefono,
        tipo: entrada.tipo,
        descripcion: entrada.descripcion,
        creadoEn: entrada.creadoEn,
        ipHash: entrada.ipHash,
        esEjemplo: false,
      });
      limites.push({ ipHash: entrada.ipHash, creadoEn: entrada.creadoEn });
      for (let indice = limites.length - 1; indice >= 0; indice -= 1) {
        const marca = limites[indice];
        if (marca && marca.creadoEn < entrada.borrarLimitesAntesDe) limites.splice(indice, 1);
      }
      return id;
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
    `INSERT INTO reportes (telefono, tipo, descripcion, creado_en, ip_hash, es_ejemplo)
     VALUES (?, ?, ?, ?, NULL, 1)`,
  );
  db.exec("BEGIN");
  try {
    for (const fila of filasSemilla(ahora)) {
      insertar.run(fila.telefono, fila.tipo, fila.descripcion, fila.creadoEn);
    }
    db.prepare(`INSERT INTO meta (clave, valor) VALUES ('semilla', '1')`).run();
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export async function crearAlmacenSqlite(archivo: string): Promise<Almacen> {
  const { DatabaseSync } = await import("node:sqlite");
  fs.mkdirSync(path.dirname(archivo), { recursive: true });
  const db = new DatabaseSync(archivo);
  db.exec(`PRAGMA journal_mode = WAL; ${SENTENCIAS_ESQUEMA.join(";")};`);
  sembrarSqlite(db);

  return {
    modo: "sqlite",
    async reportesDe(telefono) {
      return db
        .prepare(`SELECT tipo, creado_en, es_ejemplo FROM reportes WHERE telefono = ?`)
        .all(telefono) as unknown as FilaReporte[];
    },
    async conteos(desdeIso) {
      const total = Number((db.prepare(`SELECT COUNT(*) AS n FROM reportes`).get() as { n: number }).n);
      const numerosDistintos = Number(
        (db.prepare(`SELECT COUNT(DISTINCT telefono) AS n FROM reportes`).get() as { n: number }).n,
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
    async marcasDesde(ipHash, desdeIso) {
      const filas = db
        .prepare(`SELECT creado_en FROM limites WHERE ip_hash = ? AND creado_en >= ?`)
        .all(ipHash, desdeIso) as unknown as { creado_en: string }[];
      return filas.map((fila) => fila.creado_en);
    },
    async guardar(entrada) {
      db.exec("BEGIN");
      try {
        const resultado = db
          .prepare(
            `INSERT INTO reportes (telefono, tipo, descripcion, creado_en, ip_hash, es_ejemplo)
             VALUES (?, ?, ?, ?, ?, 0)`,
          )
          .run(entrada.telefono, entrada.tipo, entrada.descripcion, entrada.creadoEn, entrada.ipHash);
        db.prepare(`INSERT INTO limites (ip_hash, creado_en) VALUES (?, ?)`).run(entrada.ipHash, entrada.creadoEn);
        db.prepare(`DELETE FROM limites WHERE creado_en < ?`).run(entrada.borrarLimitesAntesDe);
        db.exec("COMMIT");
        return Number(resultado.lastInsertRowid);
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
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

async function crearAlmacenTurso(url: string, authToken: string | undefined): Promise<Almacen> {
  const { createClient } = await import("@libsql/client/web");
  const cliente = createClient({ url, authToken });
  await cliente.executeMultiple(SENTENCIAS_ESQUEMA.join(";\n"));
  const marca = await cliente.execute(`SELECT valor FROM meta WHERE clave = 'semilla'`);
  if (marca.rows.length === 0) {
    const inserts = filasSemilla().map((fila) => ({
      sql: `INSERT INTO reportes (telefono, tipo, descripcion, creado_en, ip_hash, es_ejemplo)
            VALUES (?, ?, ?, ?, NULL, 1)`,
      args: [fila.telefono, fila.tipo, fila.descripcion, fila.creadoEn],
    }));
    await cliente.batch(
      [...inserts, { sql: `INSERT INTO meta (clave, valor) VALUES ('semilla', '1')`, args: [] }],
      "write",
    );
  }

  return {
    modo: "turso",
    async reportesDe(telefono) {
      const resultado = await cliente.execute({
        sql: `SELECT tipo, creado_en, es_ejemplo FROM reportes WHERE telefono = ?`,
        args: [telefono],
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
          `SELECT COUNT(DISTINCT telefono) AS n FROM reportes`,
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
    async marcasDesde(ipHash, desdeIso) {
      const resultado = await cliente.execute({
        sql: `SELECT creado_en FROM limites WHERE ip_hash = ? AND creado_en >= ?`,
        args: [ipHash, desdeIso],
      });
      return resultado.rows.map((fila) => celda(fila as unknown as Record<string, unknown>, "creado_en"));
    },
    async guardar(entrada) {
      const [insertado] = await cliente.batch(
        [
          {
            sql: `INSERT INTO reportes (telefono, tipo, descripcion, creado_en, ip_hash, es_ejemplo)
                  VALUES (?, ?, ?, ?, ?, 0)`,
            args: [entrada.telefono, entrada.tipo, entrada.descripcion, entrada.creadoEn, entrada.ipHash],
          },
          {
            sql: `INSERT INTO limites (ip_hash, creado_en) VALUES (?, ?)`,
            args: [entrada.ipHash, entrada.creadoEn],
          },
          {
            sql: `DELETE FROM limites WHERE creado_en < ?`,
            args: [entrada.borrarLimitesAntesDe],
          },
        ],
        "write",
      );
      return Number(insertado?.lastInsertRowid ?? 0);
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
  if (!estado.semaforoAlmacen) estado.semaforoAlmacen = abrir();
  return estado.semaforoAlmacen;
}

export function corteLimites(ahora: Date): string {
  return new Date(ahora.getTime() - 2 * VENTANA_MS).toISOString();
}
