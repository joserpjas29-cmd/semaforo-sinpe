import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { rm } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";
import { crearAlmacenMemoria, crearAlmacenSqlite, fijarAlmacenParaPruebas } from "../lib/almacen";
import { consultarNumero, crearReporte } from "../lib/db";
import { hashTelefono } from "../lib/privacidad";
import { sellosParaMostrar, urlExplorador } from "../lib/sello-vista";
import { configuracionStellar, hashAnonimoReporte, preimagenAnonima, sellarReporte } from "../lib/stellar";

const archivos: string[] = [];
const entorno = {
  secret: process.env.STELLAR_SECRET_KEY,
  red: process.env.STELLAR_NETWORK,
};

function archivoTemporal(): string {
  const archivo = path.join(os.tmpdir(), `semaforo-stellar-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`);
  archivos.push(archivo);
  return archivo;
}

function restaurarEntorno() {
  if (entorno.secret === undefined) delete process.env.STELLAR_SECRET_KEY;
  else process.env.STELLAR_SECRET_KEY = entorno.secret;
  if (entorno.red === undefined) delete process.env.STELLAR_NETWORK;
  else process.env.STELLAR_NETWORK = entorno.red;
}

afterEach(async () => {
  restaurarEntorno();
  fijarAlmacenParaPruebas(null);
  for (const archivo of archivos.splice(0)) {
    for (const sufijo of ["", "-wal", "-shm", "-journal"]) await rm(`${archivo}${sufijo}`, { force: true });
  }
});

const TX = "a".repeat(64);
const OTRO_TX = "b".repeat(64);

describe("hash anónimo", () => {
  const entrada = {
    telefonoHash: "ab".repeat(32),
    id: 4,
    creadoEn: "2026-10-11T00:00:00.000Z",
  };

  it("es el SHA-256 de una preimagen sin teléfono ni descripción", () => {
    const preimagen = preimagenAnonima(entrada);
    expect(preimagen).toBe(`stopfy:v1:${entrada.telefonoHash}:4:${entrada.creadoEn}`);
    expect(preimagen).not.toContain("70004444");
    expect(preimagen).not.toContain("devolveme");
    const hash = hashAnonimoReporte(entrada);
    expect(hash).toHaveLength(32);
    expect(Buffer.from(hash).equals(createHash("sha256").update(preimagen, "utf8").digest())).toBe(true);
    expect(Buffer.from(hashAnonimoReporte({ ...entrada, id: 5 })).equals(Buffer.from(hash))).toBe(false);
  });
});

describe("configuración", () => {
  it("sin variables, con otra red o con una clave rara, no hay cuenta", () => {
    delete process.env.STELLAR_SECRET_KEY;
    delete process.env.STELLAR_NETWORK;
    expect(configuracionStellar()).toBeNull();

    process.env.STELLAR_SECRET_KEY = `S${"A".repeat(55)}`;
    process.env.STELLAR_NETWORK = "public";
    expect(configuracionStellar()).toBeNull();

    process.env.STELLAR_NETWORK = "testnet";
    process.env.STELLAR_SECRET_KEY = "no-es-una-clave";
    expect(configuracionStellar()).toBeNull();

    process.env.STELLAR_NETWORK = "TESTNET";
    process.env.STELLAR_SECRET_KEY = `S${"A".repeat(55)}`;
    expect(configuracionStellar()?.secret).toBe(`S${"A".repeat(55)}`);
  });

  it("sin cuenta, o con un teléfono en claro, no sella y no llama a la red", async () => {
    delete process.env.STELLAR_SECRET_KEY;
    delete process.env.STELLAR_NETWORK;
    const sinCuenta = await sellarReporte({
      telefonoHash: "ab".repeat(32),
      id: 1,
      creadoEn: "2026-01-01T00:00:00.000Z",
    });
    expect(sinCuenta).toBeNull();

    process.env.STELLAR_NETWORK = "testnet";
    process.env.STELLAR_SECRET_KEY = `S${"A".repeat(55)}`;
    const inicio = Date.now();
    const enPruebas = await sellarReporte({
      telefonoHash: "70004444",
      id: 1,
      creadoEn: "2026-01-01T00:00:00.000Z",
    });
    const conClaveFalsa = await sellarReporte({
      telefonoHash: "ab".repeat(32),
      id: 1,
      creadoEn: "2026-01-01T00:00:00.000Z",
    });
    expect(enPruebas).toBeNull();
    expect(conClaveFalsa).toBeNull();
    expect(Date.now() - inicio).toBeLessThan(1000);
  });
});

describe("qué se muestra", () => {
  it("solo enlaza al explorador de testnet de esa transacción", () => {
    const bueno = { tx: TX, url: urlExplorador(TX) };
    expect(sellosParaMostrar([bueno, bueno, { tx: TX, url: "https://ejemplo.com/tx" }, { tx: "corto", url: urlExplorador("corto") }])).toEqual([
      bueno,
    ]);
    expect(sellosParaMostrar(undefined)).toEqual([]);
  });
});

describe("el sello junto al reporte", () => {
  it("en memoria se anota y un valor inválido no pisa el anterior", async () => {
    const memoria = crearAlmacenMemoria();
    const hash = "cd".repeat(32);
    const id = await memoria.guardar({
      telefonoHash: hash,
      tipo: "otro",
      descripcion: "Solo para probar el sello en memoria.",
      creadoEn: "2026-01-01T00:00:00.000Z",
    });
    await memoria.anotarSello(id, "no-es-un-hash");
    expect((await memoria.reportesDe(hash))[0]?.stellar_tx).toBeNull();
    await memoria.anotarSello(id, TX.toUpperCase());
    await memoria.anotarSello(id, OTRO_TX);
    expect((await memoria.reportesDe(hash))[0]?.stellar_tx).toBe(TX);
  });

  it("sin variables el reporte se guarda, la demo no muestra sello y uno anotado sí", async () => {
    delete process.env.STELLAR_SECRET_KEY;
    delete process.env.STELLAR_NETWORK;
    const archivo = archivoTemporal();
    const almacen = await crearAlmacenSqlite(archivo);
    fijarAlmacenParaPruebas(almacen);

    const demo = await consultarNumero("60603030");
    expect(demo?.sellos).toEqual([]);

    const resultado = await crearReporte({
      telefono: "81230011",
      tipo: "comprobante_falso",
      descripcion: "Me mandó una captura y el banco no muestra el depósito.",
      ipHash: "prueba-sello",
    });
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.sello).toBeNull();

    await almacen.anotarSello(resultado.id, "basura");
    expect((await consultarNumero("81230011"))?.sellos).toEqual([]);

    await almacen.anotarSello(resultado.id, TX);
    expect((await consultarNumero("81230011"))?.sellos).toEqual([{ tx: TX, url: urlExplorador(TX) }]);

    const crudo = new DatabaseSync(archivo);
    const filas = crudo.prepare(`SELECT telefono, stellar_tx FROM reportes WHERE es_ejemplo = 0`).all() as {
      telefono: string;
      stellar_tx: string | null;
    }[];
    expect(filas).toEqual([{ telefono: "", stellar_tx: TX }]);
    crudo.close();
    almacen.cerrar();

    const contenido = fs.readFileSync(archivo).toString("latin1");
    expect(contenido).not.toContain("81230011");
    expect(contenido).toContain(TX);
  });

  it("una base vieja gana la columna sin perder reportes", async () => {
    const archivo = archivoTemporal();
    const db = new DatabaseSync(archivo);
    db.exec(`
      CREATE TABLE reportes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        telefono TEXT NOT NULL DEFAULT '',
        telefono_hash TEXT,
        tipo TEXT NOT NULL,
        descripcion TEXT NOT NULL,
        creado_en TEXT NOT NULL,
        ip_hash TEXT,
        es_ejemplo INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE eventos_limite (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        accion TEXT NOT NULL,
        clave TEXT NOT NULL,
        creado_en TEXT NOT NULL
      );
      CREATE TABLE meta (clave TEXT PRIMARY KEY, valor TEXT NOT NULL);
      INSERT INTO meta (clave, valor) VALUES ('privacidad_v1', '1');
      INSERT INTO meta (clave, valor) VALUES ('semilla', '1');
    `);
    const hash = hashTelefono("83330022");
    db.prepare(
      `INSERT INTO reportes (telefono, telefono_hash, tipo, descripcion, creado_en, ip_hash, es_ejemplo)
       VALUES ('', ?, 'otro', 'Reporte viejo, anterior al sello.', ?, NULL, 0)`,
    ).run(hash, new Date().toISOString());
    db.close();

    const almacen = await crearAlmacenSqlite(archivo);
    const columnasDb = new DatabaseSync(archivo);
    const columnas = (columnasDb.prepare(`PRAGMA table_info(reportes)`).all() as unknown as { name: string }[]).map(
      (columna) => columna.name,
    );
    columnasDb.close();
    expect(columnas).toContain("stellar_tx");
    const filas = await almacen.reportesDe(hash);
    expect(filas).toHaveLength(1);
    expect(filas[0]?.stellar_tx).toBeNull();
    almacen.cerrar();
  });
});
