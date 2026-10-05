import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { crearAlmacenMemoria, crearAlmacenSqlite, fijarAlmacenParaPruebas } from "../lib/almacen";
import { consultarNumero, crearReporte, obtenerEstadisticas } from "../lib/db";
import { hashTelefono } from "../lib/privacidad";
import { rm } from "node:fs/promises";

describe("almacén con semilla", () => {
  afterEach(() => {
    fijarAlmacenParaPruebas(null);
  });

  it("en memoria el rojo, el verde y un reporte nuevo salen sin base", async () => {
    fijarAlmacenParaPruebas(crearAlmacenMemoria());
    const ahora = new Date();

    const rojo = await consultarNumero("60603030", ahora);
    const limpio = await consultarNumero("51119090", ahora);
    expect(rojo?.color).toBe("rojo");
    expect(limpio?.color).toBe("verde");
    expect(limpio?.conteo.total).toBe(0);

    const guardado = await crearReporte({
      telefono: "62224455",
      tipo: "comprobante_falso",
      descripcion: "Me mandó una captura y el banco no muestra el depósito.",
      ipHash: "prueba-memoria",
      ahora,
    });
    expect(guardado.ok).toBe(true);

    const despues = await consultarNumero("62224455", ahora);
    expect(despues?.color).toBe("amarillo");
    expect(despues?.esEjemplo).toBe(false);

    const stats = await obtenerEstadisticas(ahora);
    expect(stats.persistencia).toBe("memoria");
    expect(stats.incluyeEjemplos).toBe(true);
    expect(stats.total).toBe(7);
  });

  it("frena el reporte número 11 de la misma conexión", async () => {
    fijarAlmacenParaPruebas(crearAlmacenMemoria());
    const ahora = new Date();
    // Números distintos: el tope por número (5 al día) es otro límite y tiene su propia prueba.
    for (let indice = 0; indice < 10; indice += 1) {
      const resultado = await crearReporte({
        telefono: `7000${1000 + indice}`,
        tipo: "otro",
        descripcion: `Aviso de prueba número ${indice} para el límite.`,
        ipHash: "prueba-limite",
        ahora,
      });
      expect(resultado.ok).toBe(true);
    }
    const extra = await crearReporte({
      telefono: "70002000",
      tipo: "otro",
      descripcion: "Este aviso ya debería topar el límite por hora.",
      ipHash: "prueba-limite",
      ahora,
    });
    expect(extra.ok).toBe(false);
    if (!extra.ok) expect(extra.codigo).toBe("limite");
  });

  it("SQLite local siembra solo y guarda un reporte", async () => {
    const archivo = path.join(os.tmpdir(), `semaforo-test-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`);
    const almacen = await crearAlmacenSqlite(archivo);
    fijarAlmacenParaPruebas(almacen);
    try {
      const ahora = new Date();
      const rojo = await consultarNumero("6060 3030", ahora);
      expect(rojo?.color).toBe("rojo");
      expect(rojo?.esEjemplo).toBe(true);

      const segunda = await crearAlmacenSqlite(archivo);
      const filas = await segunda.reportesDe(hashTelefono("60603030"));
      expect(filas.length).toBe(3);
      segunda.cerrar();

      const stats = await obtenerEstadisticas(ahora);
      expect(stats.persistencia).toBe("sqlite");
      expect(stats.total).toBe(6);
    } finally {
      almacen.cerrar();
      fijarAlmacenParaPruebas(null);
      await rm(archivo, { force: true });
      await rm(`${archivo}-wal`, { force: true });
      await rm(`${archivo}-shm`, { force: true });
    }
  });
});
