import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { rm } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fijarAlmacenParaPruebas, obtenerAlmacen } from "../lib/almacen";
import { consultarNumero, crearReporte } from "../lib/db";
import { VENTANA_MS } from "../lib/limite";
import { hashIp, hashTelefono } from "../lib/privacidad";

// El almacén de Turso importa "@libsql/client/web", que solo habla HTTP. Aquí se cambia por el
// cliente de Node con un archivo local: es el mismo motor libSQL, así que se prueban de verdad
// los lotes, rowsAffected, PRAGMA y la migración del camino de producción.
vi.mock("@libsql/client/web", async () => await import("@libsql/client"));

const archivos: string[] = [];
const DIA = 86_400_000;

function nuevaBase(): string {
  const archivo = path.join(os.tmpdir(), `semaforo-turso-${Date.now()}-${Math.random().toString(16).slice(2)}.db`);
  archivos.push(archivo);
  vi.stubEnv("TURSO_DATABASE_URL", `file:${archivo}`);
  vi.stubEnv("TURSO_AUTH_TOKEN", "");
  fijarAlmacenParaPruebas(null);
  return archivo;
}

afterEach(async () => {
  fijarAlmacenParaPruebas(null);
  vi.unstubAllEnvs();
  for (const archivo of archivos.splice(0)) {
    for (const sufijo of ["", "-wal", "-shm", "-journal"]) await rm(`${archivo}${sufijo}`, { force: true });
  }
});

describe("almacén Turso (motor libSQL local)", () => {
  it("siembra, guarda solo el hash y consulta", async () => {
    const archivo = nuevaBase();
    const almacen = await obtenerAlmacen();
    expect(almacen.modo).toBe("turso");

    expect((await consultarNumero("6060 3030"))?.color).toBe("rojo");
    expect((await consultarNumero("5111 9090"))?.color).toBe("verde");

    const resultado = await crearReporte({
      telefono: "62224455",
      tipo: "comprobante_falso",
      descripcion: "Me mandó una captura y el banco no muestra el depósito.",
      ipHash: hashIp("203.0.113.9"),
    });
    expect(resultado.ok).toBe(true);
    expect((await consultarNumero("62224455"))?.color).toBe("amarillo");

    const crudo = new DatabaseSync(archivo);
    const filas = crudo.prepare(`SELECT telefono, telefono_hash, ip_hash FROM reportes`).all() as {
      telefono: string;
      telefono_hash: string;
      ip_hash: string | null;
    }[];
    crudo.close();
    expect(filas.length).toBe(7);
    for (const fila of filas) {
      expect(fila.telefono).toBe("");
      expect(fila.telefono_hash).toMatch(/^[0-9a-f]{64}$/);
      expect(fila.ip_hash).toBeNull();
    }
    expect(fs.readFileSync(archivo).toString("latin1")).not.toContain("62224455");
  });

  it("el límite es atómico y los intentos rechazados no alargan la espera", async () => {
    nuevaBase();
    const almacen = await obtenerAlmacen();
    expect(almacen.modo).toBe("turso");
    const t0 = new Date("2026-10-03T12:00:00.000Z");
    const entrada = (ahora: Date) => ({ accion: "prueba", clave: "k", maximo: 3, ventanaMs: VENTANA_MS, ahora });

    for (let i = 0; i < 3; i += 1) expect((await almacen.consumirLimite(entrada(t0))).permitido).toBe(true);
    const cuarto = await almacen.consumirLimite(entrada(t0));
    expect(cuarto).toEqual({ permitido: false, reintentarEnSeg: 3600 });

    const diezMinutos = new Date(t0.getTime() + 10 * 60_000);
    for (let i = 0; i < 4; i += 1) expect((await almacen.consumirLimite(entrada(diezMinutos))).permitido).toBe(false);
    expect((await almacen.consumirLimite(entrada(diezMinutos))).reintentarEnSeg).toBe(3000);

    const pasada = new Date(t0.getTime() + VENTANA_MS + 1000);
    for (let i = 0; i < 3; i += 1) expect((await almacen.consumirLimite(entrada(pasada))).permitido).toBe(true);
    expect((await almacen.consumirLimite(entrada(pasada))).permitido).toBe(false);
  });

  it("migra una base vieja con teléfonos e IP en claro", async () => {
    const archivo = nuevaBase();
    const ahora = new Date().toISOString();
    const vieja = new DatabaseSync(archivo);
    vieja.exec(`
      CREATE TABLE reportes (
        id INTEGER PRIMARY KEY AUTOINCREMENT, telefono TEXT NOT NULL, tipo TEXT NOT NULL,
        descripcion TEXT NOT NULL, creado_en TEXT NOT NULL, ip_hash TEXT, es_ejemplo INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX idx_reportes_telefono ON reportes(telefono);
      CREATE TABLE limites (id INTEGER PRIMARY KEY AUTOINCREMENT, ip_hash TEXT NOT NULL, creado_en TEXT NOT NULL);
      CREATE TABLE meta (clave TEXT PRIMARY KEY, valor TEXT NOT NULL);
      INSERT INTO meta (clave, valor) VALUES ('semilla', '1');
    `);
    vieja
      .prepare(`INSERT INTO reportes (telefono, tipo, descripcion, creado_en, ip_hash, es_ejemplo) VALUES (?, ?, ?, ?, ?, 0)`)
      .run("64445566", "comprobante_falso", "Reporte de la base vieja, con teléfono en claro.", ahora, "ip-vieja");
    vieja.close();

    const almacen = await obtenerAlmacen();
    expect(almacen.modo).toBe("turso");
    expect(await almacen.reportesDe(hashTelefono("64445566"))).toHaveLength(1);

    const crudo = new DatabaseSync(archivo);
    const enClaro = crudo.prepare(`SELECT COUNT(*) AS n FROM reportes WHERE telefono <> ''`).get() as { n: number };
    const conIp = crudo.prepare(`SELECT COUNT(*) AS n FROM reportes WHERE ip_hash IS NOT NULL`).get() as { n: number };
    const restos = crudo.prepare(`SELECT name FROM sqlite_master WHERE name IN ('limites', 'idx_reportes_telefono')`).all();
    crudo.close();
    expect(Number(enClaro.n)).toBe(0);
    expect(Number(conIp.n)).toBe(0);
    expect(restos).toHaveLength(0);

    // Reabrir no repite la migración ni falla.
    fijarAlmacenParaPruebas(null);
    const otra = await obtenerAlmacen();
    expect(await otra.reportesDe(hashTelefono("64445566"))).toHaveLength(1);
  });

  it("borra a los 180 días lo que no es de demostración", async () => {
    nuevaBase();
    const almacen = await obtenerAlmacen();
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
    await guardar(10);
    expect(await almacen.reportesDe(hash)).toHaveLength(2);

    await consultarNumero("62224455", ahora);
    expect(await almacen.reportesDe(hash)).toHaveLength(1);
    expect((await consultarNumero("88810001", ahora))?.conteo.total).toBe(1);
  });
});
