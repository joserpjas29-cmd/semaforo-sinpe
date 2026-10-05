import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { rm } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";
import { crearAlmacenMemoria, crearAlmacenSqlite, fijarAlmacenParaPruebas, type Almacen } from "../lib/almacen";
import { consultarNumero, crearReporte } from "../lib/db";
import { hashIp, hashTelefono } from "../lib/privacidad";

const archivos: string[] = [];

function archivoTemporal(): string {
  const archivo = path.join(os.tmpdir(), `semaforo-priv-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`);
  archivos.push(archivo);
  return archivo;
}

/** Todo el contenido en disco: la base y su archivo -wal. */
function bytesEnDisco(archivo: string): string {
  return ["", "-wal"]
    .map((sufijo) => (fs.existsSync(`${archivo}${sufijo}`) ? fs.readFileSync(`${archivo}${sufijo}`).toString("latin1") : ""))
    .join("");
}

afterEach(async () => {
  fijarAlmacenParaPruebas(null);
  for (const archivo of archivos.splice(0)) {
    for (const sufijo of ["", "-wal", "-shm", "-journal"]) await rm(`${archivo}${sufijo}`, { force: true });
  }
});

const DIA = 86_400_000;

describe("lo que se guarda en disco", () => {
  it("el reporte queda con el HMAC del teléfono y sin número ni IP", async () => {
    const archivo = archivoTemporal();
    const almacen = await crearAlmacenSqlite(archivo);
    fijarAlmacenParaPruebas(almacen);

    const resultado = await crearReporte({
      telefono: "+506 6222 4455",
      tipo: "comprobante_falso",
      descripcion: "Me mandó una captura y el banco no muestra el depósito.",
      ipHash: hashIp("203.0.113.9"),
    });
    expect(resultado.ok).toBe(true);

    const crudo = new DatabaseSync(archivo);
    const filas = crudo.prepare(`SELECT telefono, telefono_hash, ip_hash, es_ejemplo FROM reportes`).all() as {
      telefono: string;
      telefono_hash: string;
      ip_hash: string | null;
      es_ejemplo: number;
    }[];
    for (const fila of filas) {
      expect(fila.telefono).toBe("");
      expect(fila.telefono_hash).toMatch(/^[0-9a-f]{64}$/);
      expect(fila.ip_hash).toBeNull();
    }
    const nuevo = filas.find((fila) => fila.es_ejemplo === 0);
    expect(nuevo?.telefono_hash).toBe(hashTelefono("62224455"));

    // La clave de límite por número tampoco es el número.
    const claves = crudo.prepare(`SELECT clave FROM eventos_limite`).all() as { clave: string }[];
    expect(claves.length).toBeGreaterThan(0);
    for (const { clave } of claves) expect(clave).not.toContain("62224455");
    crudo.close();
    almacen.cerrar();

    const contenido = bytesEnDisco(archivo);
    expect(contenido).not.toContain("62224455");
    expect(contenido).not.toContain("60603030");
    expect(contenido).not.toContain("203.0.113.9");
  });
});

describe("migración de una base vieja", () => {
  function crearBaseVieja(archivo: string) {
    const ahora = new Date().toISOString();
    const db = new DatabaseSync(archivo);
    db.exec(`
      CREATE TABLE reportes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        telefono TEXT NOT NULL,
        tipo TEXT NOT NULL,
        descripcion TEXT NOT NULL,
        creado_en TEXT NOT NULL,
        ip_hash TEXT,
        es_ejemplo INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX idx_reportes_telefono ON reportes(telefono);
      CREATE INDEX idx_reportes_creado ON reportes(creado_en);
      CREATE TABLE limites (id INTEGER PRIMARY KEY AUTOINCREMENT, ip_hash TEXT NOT NULL, creado_en TEXT NOT NULL);
      CREATE INDEX idx_limites_ip ON limites(ip_hash, creado_en);
      CREATE TABLE meta (clave TEXT PRIMARY KEY, valor TEXT NOT NULL);
      INSERT INTO meta (clave, valor) VALUES ('semilla', '1');
    `);
    const insertar = db.prepare(
      `INSERT INTO reportes (telefono, tipo, descripcion, creado_en, ip_hash, es_ejemplo) VALUES (?, ?, ?, ?, ?, ?)`,
    );
    insertar.run("64445566", "comprobante_falso", "Reporte de la base vieja, con teléfono en claro.", ahora, "ip-vieja", 0);
    insertar.run("60603030", "otro", "Ejemplo ficticio sembrado antes.", ahora, null, 1);
    db.prepare(`INSERT INTO limites (ip_hash, creado_en) VALUES (?, ?)`).run("ip-vieja", ahora);
    db.close();
  }

  it("calcula los hashes, borra los números en claro y limpia lo heredado", async () => {
    const archivo = archivoTemporal();
    crearBaseVieja(archivo);
    expect(bytesEnDisco(archivo)).toContain("64445566");

    const almacen = await crearAlmacenSqlite(archivo);
    fijarAlmacenParaPruebas(almacen);

    const filas = await almacen.reportesDe(hashTelefono("64445566"));
    expect(filas).toHaveLength(1);
    expect(filas[0]?.tipo).toBe("comprobante_falso");
    expect((await consultarNumero("60603030"))?.esEjemplo).toBe(true);

    const crudo = new DatabaseSync(archivo);
    const enClaro = crudo.prepare(`SELECT COUNT(*) AS n FROM reportes WHERE telefono <> ''`).get() as { n: number };
    const conIp = crudo.prepare(`SELECT COUNT(*) AS n FROM reportes WHERE ip_hash IS NOT NULL`).get() as { n: number };
    const restos = crudo
      .prepare(`SELECT name FROM sqlite_master WHERE name IN ('limites', 'idx_reportes_telefono', 'idx_limites_ip')`)
      .all();
    crudo.close();
    expect(Number(enClaro.n)).toBe(0);
    expect(Number(conIp.n)).toBe(0);
    expect(restos).toHaveLength(0);

    almacen.cerrar();
    const contenido = bytesEnDisco(archivo);
    expect(contenido).not.toContain("64445566");
    expect(contenido).not.toContain("ip-vieja");
  });

  it("abrir otra vez no cambia nada ni falla", async () => {
    const archivo = archivoTemporal();
    crearBaseVieja(archivo);
    (await crearAlmacenSqlite(archivo)).cerrar();

    const segunda = await crearAlmacenSqlite(archivo);
    expect(await segunda.reportesDe(hashTelefono("64445566"))).toHaveLength(1);
    expect((await segunda.conteos(new Date(0).toISOString())).total).toBe(2);
    segunda.cerrar();
  });
});

const almacenes: [string, () => Promise<Almacen>][] = [
  ["memoria", async () => crearAlmacenMemoria()],
  ["sqlite", async () => crearAlmacenSqlite(archivoTemporal())],
];

describe.each(almacenes)("retención de 6 meses (%s)", (_nombre, crear) => {
  it("borra los reportes de más de 180 días y conserva los recientes y los de demostración", async () => {
    const almacen = await crear();
    fijarAlmacenParaPruebas(almacen);
    const ahora = new Date();
    const hash = hashTelefono("62224455");
    const guardar = (diasAtras: number) =>
      almacen.guardar({
        telefonoHash: hash,
        tipo: "otro",
        descripcion: "Reporte de prueba para la retención.",
        creadoEn: new Date(ahora.getTime() - diasAtras * DIA).toISOString(),
      });
    await guardar(200);
    await guardar(179);
    await guardar(10);
    expect(await almacen.reportesDe(hash)).toHaveLength(3);

    const consulta = await consultarNumero("62224455", ahora);
    expect(await almacen.reportesDe(hash)).toHaveLength(2);
    expect(consulta?.conteo.total).toBe(2);

    // 8881 0001 es de demostración y su reporte tiene 400 días: se queda.
    const demo = await consultarNumero("88810001", ahora);
    expect(demo?.conteo.total).toBe(1);
    expect(demo?.esEjemplo).toBe(true);
    almacen.cerrar();
  });

  it("el borrado corre como mucho una vez por hora", async () => {
    const almacen = await crear();
    fijarAlmacenParaPruebas(almacen);
    const ahora = new Date();
    const hash = hashTelefono("62224455");
    await consultarNumero("62224455", ahora);

    await almacen.guardar({
      telefonoHash: hash,
      tipo: "otro",
      descripcion: "Reporte vencido que llega entre dos borrados.",
      creadoEn: new Date(ahora.getTime() - 300 * DIA).toISOString(),
    });
    await consultarNumero("62224455", new Date(ahora.getTime() + 30 * 60_000));
    expect(await almacen.reportesDe(hash)).toHaveLength(1);

    await consultarNumero("62224455", new Date(ahora.getTime() + 61 * 60_000));
    expect(await almacen.reportesDe(hash)).toHaveLength(0);
    almacen.cerrar();
  });
});
