import { readFile } from "node:fs/promises";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { analizarComprobante } from "../lib/comprobante";
import { COMPROBANTES_DEMO } from "../lib/ejemplos";
import { cerrarOcr, leerImagen } from "../lib/ocr";

const ahora = new Date(2026, 9, 2, 15, 0, 0);

describe("comprobantes de ejemplo", () => {
  afterAll(async () => {
    await cerrarOcr();
  });

  it("el OCR local los deja en el color de la demo", async () => {
    for (const ejemplo of COMPROBANTES_DEMO) {
      const buffer = await readFile(path.join(process.cwd(), "public", ejemplo.src));
      const lectura = await leerImagen(buffer);
      const resultado = analizarComprobante(lectura.texto, "", {
        ahora,
        confianzaGlobal: lectura.confianza,
        palabras: lectura.palabras,
      });
      expect(
        resultado.color,
        `${ejemplo.archivo}: ${resultado.senales.map((senal) => senal.id).join(", ") || "sin señales"}\n${lectura.texto}`,
      ).toBe(ejemplo.esperado);
    }
  });
});
