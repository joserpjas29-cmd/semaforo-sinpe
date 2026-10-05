import { describe, expect, it } from "vitest";
import { interpretarRespuesta, MENSAJE_DEMASIADOS_INTENTOS, mensajeLimite } from "../lib/mensaje-limite";

const ahora = new Date("2026-10-05T12:00:00.000Z");

describe("mensajeLimite", () => {
  it("ignora lo que no es 429", () => {
    expect(mensajeLimite({ status: 400, retryAfter: "120", error: "Elegí un tipo." })).toBeNull();
    expect(mensajeLimite({ status: 500 })).toBeNull();
  });

  it("arma el aviso con Retry-After en segundos", () => {
    expect(mensajeLimite({ status: 429, retryAfter: "120", ahora })).toBe(
      "Demasiados intentos. Volvé a intentar en 2 minutos.",
    );
    expect(mensajeLimite({ status: 429, retryAfter: "45", ahora })).toBe(
      "Demasiados intentos. Volvé a intentar en un minuto.",
    );
    expect(mensajeLimite({ status: 429, retryAfter: "3600", ahora })).toBe(
      "Demasiados intentos. Volvé a intentar en una hora.",
    );
    expect(mensajeLimite({ status: 429, retryAfter: "7200", ahora })).toBe(
      "Demasiados intentos. Volvé a intentar en 2 horas.",
    );
  });

  it("prefiere Retry-After aunque el JSON traiga otro plazo", () => {
    expect(
      mensajeLimite({
        status: 429,
        retryAfter: "180",
        reintentarEnSeg: 7200,
        error: "Ya mandaste muchos reportes.",
        ahora,
      }),
    ).toBe("Demasiados intentos. Volvé a intentar en 3 minutos.");
  });

  it("acepta Retry-After como fecha HTTP", () => {
    expect(
      mensajeLimite({
        status: 429,
        retryAfter: "Mon, 05 Oct 2026 12:05:00 GMT",
        ahora,
      }),
    ).toBe("Demasiados intentos. Volvé a intentar en 5 minutos.");
  });

  it("si la cabecera no sirve, usa reintentarEnSeg y luego el error del JSON", () => {
    expect(mensajeLimite({ status: 429, retryAfter: "pronto", reintentarEnSeg: 600, ahora })).toBe(
      "Demasiados intentos. Volvé a intentar en 10 minutos.",
    );
    expect(mensajeLimite({ status: 429, retryAfter: "pronto", error: "  Ya analizaste varios.  " })).toBe(
      "Ya analizaste varios.",
    );
  });

  it("sin plazo ni texto, deja la frase fija", () => {
    expect(mensajeLimite({ status: 429 })).toBe(MENSAJE_DEMASIADOS_INTENTOS);
    expect(mensajeLimite({ status: 429, retryAfter: "   ", error: "  " })).toBe(MENSAJE_DEMASIADOS_INTENTOS);
  });
});

describe("interpretarRespuesta", () => {
  it("muestra el 429 aunque el cuerpo no sea JSON", async () => {
    const respuesta = new Response("no es json", { status: 429, headers: { "Retry-After": "120" } });
    const leido = await interpretarRespuesta(respuesta, "No se pudo consultar.");
    expect(leido).toEqual({ ok: false, error: "Demasiados intentos. Volvé a intentar en 2 minutos." });
  });

  it("en un 400 conserva el error de la API", async () => {
    const respuesta = new Response(JSON.stringify({ error: "El celular de Costa Rica tiene 8 dígitos." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
    const leido = await interpretarRespuesta<{ telefono?: string }>(respuesta, "No se pudo consultar.");
    expect(leido).toEqual({ ok: false, error: "El celular de Costa Rica tiene 8 dígitos." });
  });

  it("en un 200 devuelve los datos", async () => {
    const respuesta = new Response(JSON.stringify({ telefono: "88880000", color: "verde" }), { status: 200 });
    const leido = await interpretarRespuesta<{ telefono: string }>(respuesta, "No se pudo consultar.");
    expect(leido.ok).toBe(true);
    if (leido.ok) expect(leido.datos.telefono).toBe("88880000");
  });
});
