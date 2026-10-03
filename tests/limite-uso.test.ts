import os from "node:os";
import path from "node:path";
import { rm } from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vitest";
import { crearAlmacenMemoria, crearAlmacenSqlite, fijarAlmacenParaPruebas, type Almacen } from "../lib/almacen";
import { crearReporte, ipDesdeRequest } from "../lib/db";
import { DIA_MS, reglaLimite, VENTANA_MS } from "../lib/limite";
import { POST as consultar } from "../app/api/consultar/route";
import { POST as analizar } from "../app/api/analizar/route";
import { POST as reportar } from "../app/api/reportar/route";

const archivos: string[] = [];

function archivoTemporal(): string {
  const archivo = path.join(os.tmpdir(), `semaforo-limite-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`);
  archivos.push(archivo);
  return archivo;
}

afterEach(async () => {
  fijarAlmacenParaPruebas(null);
  vi.unstubAllEnvs();
  for (const archivo of archivos.splice(0)) {
    for (const sufijo of ["", "-wal", "-shm", "-journal"]) await rm(`${archivo}${sufijo}`, { force: true });
  }
});

const almacenes: [string, () => Promise<Almacen>][] = [
  ["memoria", async () => crearAlmacenMemoria()],
  ["sqlite", async () => crearAlmacenSqlite(archivoTemporal())],
];

describe.each(almacenes)("consumirLimite (%s)", (_nombre, crear) => {
  const t0 = new Date("2026-10-03T12:00:00.000Z");
  const despues = (ms: number) => new Date(t0.getTime() + ms);
  const entrada = (ahora: Date, extra: Partial<{ accion: string; clave: string }> = {}) => ({
    accion: "prueba",
    clave: "clave-a",
    maximo: 3,
    ventanaMs: VENTANA_MS,
    ahora,
    ...extra,
  });

  it("deja pasar hasta el máximo y después dice cuánto esperar", async () => {
    const almacen = await crear();
    for (let i = 0; i < 3; i += 1) {
      expect((await almacen.consumirLimite(entrada(t0))).permitido).toBe(true);
    }
    const cuarto = await almacen.consumirLimite(entrada(t0));
    expect(cuarto.permitido).toBe(false);
    expect(cuarto.reintentarEnSeg).toBe(3600);

    const diezMinutos = await almacen.consumirLimite(entrada(despues(10 * 60_000)));
    expect(diezMinutos.permitido).toBe(false);
    expect(diezMinutos.reintentarEnSeg).toBe(3000);
    almacen.cerrar();
  });

  it("los intentos rechazados no alargan la espera", async () => {
    const almacen = await crear();
    for (let i = 0; i < 3; i += 1) await almacen.consumirLimite(entrada(t0));
    for (let i = 0; i < 5; i += 1) {
      expect((await almacen.consumirLimite(entrada(despues(10 * 60_000)))).permitido).toBe(false);
    }
    // Al salir la ventana de los tres primeros usos, vuelven a caber tres: nada de lo rechazado quedó anotado.
    for (let i = 0; i < 3; i += 1) {
      expect((await almacen.consumirLimite(entrada(despues(VENTANA_MS + 1000)))).permitido).toBe(true);
    }
    expect((await almacen.consumirLimite(entrada(despues(VENTANA_MS + 1000)))).permitido).toBe(false);
    almacen.cerrar();
  });

  it("cada clave y cada acción llevan su propia cuenta", async () => {
    const almacen = await crear();
    for (let i = 0; i < 3; i += 1) await almacen.consumirLimite(entrada(t0));
    expect((await almacen.consumirLimite(entrada(t0))).permitido).toBe(false);
    expect((await almacen.consumirLimite(entrada(t0, { clave: "clave-b" }))).permitido).toBe(true);
    expect((await almacen.consumirLimite(entrada(t0, { accion: "otra" }))).permitido).toBe(true);
    almacen.cerrar();
  });

  it("purgar borra los usos viejos del límite", async () => {
    const almacen = await crear();
    const dia = { ventanaMs: DIA_MS, maximo: 1 };
    expect((await almacen.consumirLimite({ ...entrada(t0), ...dia })).permitido).toBe(true);
    expect((await almacen.consumirLimite({ ...entrada(despues(1000)), ...dia })).permitido).toBe(false);
    await almacen.purgar({ reportesAntesDe: t0.toISOString(), eventosAntesDe: despues(500).toISOString() });
    expect((await almacen.consumirLimite({ ...entrada(despues(1000)), ...dia })).permitido).toBe(true);
    almacen.cerrar();
  });
});

describe("límites al reportar", () => {
  const descripcion = "Me mandó una captura y el banco no muestra el depósito.";

  it("un mismo número no recibe más de 5 reportes al día, aunque cambien de conexión", async () => {
    fijarAlmacenParaPruebas(crearAlmacenMemoria());
    const ahora = new Date();
    for (let i = 0; i < 5; i += 1) {
      const resultado = await crearReporte({
        telefono: "62224455",
        tipo: "comprobante_falso",
        descripcion,
        ipHash: `conexion-${i}`,
        ahora,
      });
      expect(resultado.ok).toBe(true);
    }
    const sexto = await crearReporte({
      telefono: "6222 4455",
      tipo: "comprobante_falso",
      descripcion,
      ipHash: "conexion-nueva",
      ahora,
    });
    expect(sexto.ok).toBe(false);
    if (!sexto.ok && sexto.codigo === "limite") {
      expect(sexto.error).toContain("Este número");
      expect(sexto.reintentarEnSeg).toBeGreaterThan(0);
      expect(sexto.reintentarEnSeg).toBeLessThanOrEqual(86_400);
    } else {
      throw new Error("Se esperaba el código de límite");
    }

    const otro = await crearReporte({
      telefono: "62224456",
      tipo: "comprobante_falso",
      descripcion,
      ipHash: "conexion-nueva",
      ahora,
    });
    expect(otro.ok).toBe(true);
  });

  it("el tope por conexión informa cuánto esperar", async () => {
    fijarAlmacenParaPruebas(crearAlmacenMemoria());
    vi.stubEnv("LIMITE_REPORTES_POR_HORA", "2");
    const ahora = new Date();
    for (let i = 0; i < 2; i += 1) {
      const resultado = await crearReporte({
        telefono: `6333000${i}`,
        tipo: "otro",
        descripcion,
        ipHash: "misma-conexion",
        ahora,
      });
      expect(resultado.ok).toBe(true);
    }
    const tercero = await crearReporte({
      telefono: "63330009",
      tipo: "otro",
      descripcion,
      ipHash: "misma-conexion",
      ahora,
    });
    expect(tercero.ok).toBe(false);
    if (!tercero.ok && tercero.codigo === "limite") {
      expect(tercero.reintentarEnSeg).toBe(3600);
      expect(tercero.error).toContain("2 reportes");
    } else {
      throw new Error("Se esperaba el código de límite");
    }
  });

  it("un reporte con datos inválidos no gasta ningún cupo", async () => {
    fijarAlmacenParaPruebas(crearAlmacenMemoria());
    vi.stubEnv("LIMITE_REPORTES_POR_HORA", "1");
    const ahora = new Date();
    for (let i = 0; i < 3; i += 1) {
      const malo = await crearReporte({ telefono: "123", tipo: "otro", descripcion, ipHash: "conexion", ahora });
      expect(malo.ok).toBe(false);
    }
    const bueno = await crearReporte({ telefono: "63330000", tipo: "otro", descripcion, ipHash: "conexion", ahora });
    expect(bueno.ok).toBe(true);
  });
});

describe("reglas ajustables por entorno", () => {
  it("usa los valores por defecto", () => {
    expect(reglaLimite("reportar_ip")).toMatchObject({ maximo: 10, ventanaMs: VENTANA_MS });
    expect(reglaLimite("reportar_numero")).toMatchObject({ maximo: 5, ventanaMs: DIA_MS });
    expect(reglaLimite("consultar_ip")).toMatchObject({ maximo: 120, ventanaMs: VENTANA_MS });
    expect(reglaLimite("analizar_ip")).toMatchObject({ maximo: 20, ventanaMs: VENTANA_MS });
  });

  it("acepta enteros positivos y descarta lo demás", () => {
    vi.stubEnv("LIMITE_CONSULTAS_POR_HORA", "7");
    expect(reglaLimite("consultar_ip").maximo).toBe(7);
    for (const malo of ["abc", "0", "-3", "2.5", ""]) {
      vi.stubEnv("LIMITE_CONSULTAS_POR_HORA", malo);
      expect(reglaLimite("consultar_ip").maximo).toBe(120);
    }
  });
});

describe("IP del visitante", () => {
  const pedir = (cabeceras: Record<string, string>) => new Request("http://localhost/", { headers: cabeceras });

  it("prefiere las cabeceras de la plataforma", () => {
    expect(
      ipDesdeRequest(pedir({ "x-vercel-forwarded-for": "5.5.5.5", "x-real-ip": "6.6.6.6", "x-forwarded-for": "1.1.1.1" })),
    ).toBe("5.5.5.5");
    expect(ipDesdeRequest(pedir({ "x-real-ip": "6.6.6.6", "x-forwarded-for": "1.1.1.1" }))).toBe("6.6.6.6");
  });

  it("de X-Forwarded-For toma el último valor, no el que escribe el visitante", () => {
    expect(ipDesdeRequest(pedir({ "x-forwarded-for": "9.9.9.9, 1.2.3.4, 203.0.113.7" }))).toBe("203.0.113.7");
  });

  it("acepta IPv6 y descarta valores que no parecen una IP", () => {
    expect(ipDesdeRequest(pedir({ "x-real-ip": "2001:db8::1" }))).toBe("2001:db8::1");
    expect(ipDesdeRequest(pedir({ "x-real-ip": "<script>alert(1)</script>" }))).toBe("local");
    expect(ipDesdeRequest(pedir({}))).toBe("local");
  });
});

describe("respuestas 429 de las rutas", () => {
  const json = (url: string, cuerpo: unknown) =>
    new Request(`http://localhost${url}`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-real-ip": "203.0.113.50" },
      body: JSON.stringify(cuerpo),
    });

  it("/api/consultar frena con 429, mensaje y Retry-After", async () => {
    fijarAlmacenParaPruebas(crearAlmacenMemoria());
    vi.stubEnv("LIMITE_CONSULTAS_POR_HORA", "2");
    for (let i = 0; i < 2; i += 1) {
      expect((await consultar(json("/api/consultar", { telefono: "60603030" }))).status).toBe(200);
    }
    const bloqueada = await consultar(json("/api/consultar", { telefono: "60603030" }));
    expect(bloqueada.status).toBe(429);
    expect(Number(bloqueada.headers.get("Retry-After"))).toBeGreaterThan(0);
    const cuerpo = (await bloqueada.json()) as { error: string; reintentarEnSeg: number };
    expect(cuerpo.error).toContain("consultas");
    expect(cuerpo.reintentarEnSeg).toBeGreaterThan(0);
  });

  it("/api/consultar cuenta por conexión: otra IP sigue pasando", async () => {
    fijarAlmacenParaPruebas(crearAlmacenMemoria());
    vi.stubEnv("LIMITE_CONSULTAS_POR_HORA", "1");
    expect((await consultar(json("/api/consultar", { telefono: "60603030" }))).status).toBe(200);
    expect((await consultar(json("/api/consultar", { telefono: "60603030" }))).status).toBe(429);
    const otra = new Request("http://localhost/api/consultar", {
      method: "POST",
      headers: { "content-type": "application/json", "x-real-ip": "198.51.100.8" },
      body: JSON.stringify({ telefono: "60603030" }),
    });
    expect((await consultar(otra)).status).toBe(200);
  });

  it("/api/analizar frena con 429 antes de leer la imagen", async () => {
    fijarAlmacenParaPruebas(crearAlmacenMemoria());
    vi.stubEnv("LIMITE_ANALISIS_POR_HORA", "1");
    const sinImagen = () =>
      new Request("http://localhost/api/analizar", {
        method: "POST",
        headers: { "x-real-ip": "203.0.113.50" },
        body: new FormData(),
      });
    expect((await analizar(sinImagen())).status).toBe(400);
    const bloqueada = await analizar(sinImagen());
    expect(bloqueada.status).toBe(429);
    expect(bloqueada.headers.get("Retry-After")).toBeTruthy();
  });

  it("/api/reportar responde 429 con el mismo formato", async () => {
    fijarAlmacenParaPruebas(crearAlmacenMemoria());
    vi.stubEnv("LIMITE_REPORTES_POR_HORA", "1");
    const cuerpo = (telefono: string) => ({
      telefono,
      tipo: "otro",
      descripcion: "Me mandó una captura y el banco no muestra el depósito.",
    });
    expect((await reportar(json("/api/reportar", cuerpo("63330001")))).status).toBe(200);
    const bloqueada = await reportar(json("/api/reportar", cuerpo("63330002")));
    expect(bloqueada.status).toBe(429);
    expect(bloqueada.headers.get("Retry-After")).toBe("3600");
    expect(((await bloqueada.json()) as { error: string }).error).toContain("reportes");
  });
});
