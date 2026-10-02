import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { analizarComprobante } from "../lib/comprobante";
import { COMPROBANTES_DEMO } from "../lib/ejemplos";
import { textoDeEjemplo } from "../lib/ejemplos-texto";

const ahora = new Date(2026, 9, 2, 15, 0, 0);

describe("respaldo de comprobantes", () => {
  it("las capturas de ejemplo coinciden con su texto y su color sin OCR", async () => {
    for (const ejemplo of COMPROBANTES_DEMO) {
      const buffer = await readFile(path.join(process.cwd(), "public", ejemplo.src));
      const texto = textoDeEjemplo(buffer);
      expect(texto, ejemplo.archivo).toBeTruthy();
      const resultado = analizarComprobante(texto ?? "", "", { ahora });
      expect(resultado.color, resultado.senales.map((senal) => senal.id).join(",")).toBe(ejemplo.esperado);
    }
  });

  it("una imagen desconocida no usa el texto preparado", () => {
    expect(textoDeEjemplo(Buffer.from("no es un comprobante"))).toBeNull();
  });

  it("si no hay lectura, el mensaje igual se marca y la captura no sale verde", () => {
    const vacio = analizarComprobante("", "", { ahora });
    expect(vacio.color).toBe("amarillo");
    expect(vacio.senales.some((senal) => senal.id === "lectura_insuficiente")).toBe(true);

    const guion = analizarComprobante(
      "",
      "Mae me equivoqué de número, por favor devuélvame la plata ya mismo que es urgente.",
      { ahora },
    );
    expect(guion.color).toBe("rojo");
    expect(guion.senales.map((senal) => senal.id)).toEqual(
      expect.arrayContaining(["lectura_insuficiente", "guion_equivocacion", "guion_devolucion", "guion_urgencia"]),
    );
  });
});
