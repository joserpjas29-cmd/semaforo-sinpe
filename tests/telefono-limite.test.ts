import { describe, expect, it } from "vitest";
import { contarEnVentana, excedeLimite, LIMITE_REPORTES, VENTANA_MS } from "../lib/limite";
import { formatearTelefono, normalizarTelefono, pareceCelular } from "../lib/telefono";

describe("teléfonos de Costa Rica", () => {
  it("acepta 8 dígitos con espacios o guiones", () => {
    expect(normalizarTelefono("8881-0001")).toBe("88810001");
    expect(normalizarTelefono("8881 0001")).toBe("88810001");
  });

  it("acepta el prefijo +506", () => {
    expect(normalizarTelefono("+506 6060 3030")).toBe("60603030");
    expect(normalizarTelefono("0050688810001")).toBe("88810001");
  });

  it("rechaza números incompletos", () => {
    expect(normalizarTelefono("8881000")).toBeNull();
    expect(normalizarTelefono("hola")).toBeNull();
    expect(normalizarTelefono("506 888")).toBeNull();
  });

  it("formatea y reconoce celulares", () => {
    expect(formatearTelefono("60603030")).toBe("6060 3030");
    expect(pareceCelular("60603030")).toBe(true);
    expect(pareceCelular("22225678")).toBe(false);
  });
});

describe("límite de reportes", () => {
  const ahora = new Date("2026-10-02T15:00:00.000Z");

  it("cuenta solo las marcas dentro de la ventana", () => {
    const marcas = [
      new Date(ahora.getTime() - 10 * 60 * 1000).toISOString(),
      new Date(ahora.getTime() - VENTANA_MS - 1000).toISOString(),
    ];
    expect(contarEnVentana(marcas, ahora)).toBe(1);
  });

  it("bloquea al llegar al máximo", () => {
    expect(excedeLimite(LIMITE_REPORTES - 1)).toBe(false);
    expect(excedeLimite(LIMITE_REPORTES)).toBe(true);
  });
});
