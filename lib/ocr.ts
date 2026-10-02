import fs from "node:fs";
import path from "node:path";
import { createWorker, PSM, type Worker } from "tesseract.js";
import type { PalabraOcr } from "./tipos";

/** El OCR cede el paso antes de que Vercel corte la función (máximo 60 s). */
export const OCR_TOPE_MS = 25_000;

interface BloqueTesseract {
  paragraphs?: {
    lines?: {
      words?: { text?: string; confidence?: number }[];
    }[];
  }[];
}

const globalOcr = globalThis as unknown as { trabajador?: Promise<Worker> };

function rutaCache(): string {
  // En Vercel el disco del proyecto es de solo lectura. /tmp vive con la instancia.
  return process.env.VERCEL ? "/tmp/tesseract-cache" : path.join(process.cwd(), ".tesseract-cache");
}

async function crearTrabajador(): Promise<Worker> {
  const cachePath = rutaCache();
  fs.mkdirSync(cachePath, { recursive: true });
  const trabajador = await createWorker("spa", 1, {
    langPath: path.join(process.cwd(), "tessdata"),
    cachePath,
    gzip: false,
    workerBlobURL: false,
    cacheMethod: process.env.VERCEL ? "readOnly" : "write",
  });
  await trabajador.setParameters({
    tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
    preserve_interword_spaces: "1",
  });
  return trabajador;
}

function obtenerTrabajador(): Promise<Worker> {
  if (!globalOcr.trabajador) {
    globalOcr.trabajador = crearTrabajador();
  }
  return globalOcr.trabajador;
}

function palabrasDesdeBloques(bloques: BloqueTesseract[] | null | undefined): PalabraOcr[] {
  const palabras: PalabraOcr[] = [];
  for (const bloque of bloques ?? []) {
    for (const parrafo of bloque.paragraphs ?? []) {
      for (const linea of parrafo.lines ?? []) {
        for (const palabra of linea.words ?? []) {
          const texto = palabra.text?.trim();
          if (!texto) continue;
          palabras.push({ texto, confianza: palabra.confidence ?? 0 });
        }
      }
    }
  }
  return palabras;
}

export interface LecturaOcr {
  texto: string;
  confianza: number | null;
  palabras: PalabraOcr[];
}

async function reconocer(buffer: Buffer): Promise<LecturaOcr> {
  const trabajador = await obtenerTrabajador();
  const resultado = await trabajador.recognize(buffer, {}, { text: true, blocks: true });
  const datos = resultado.data;
  return {
    texto: datos.text ?? "",
    confianza: typeof datos.confidence === "number" ? datos.confidence : null,
    palabras: palabrasDesdeBloques(datos.blocks as BloqueTesseract[] | null),
  };
}

export async function leerImagen(buffer: Buffer): Promise<LecturaOcr> {
  try {
    return await reconocer(buffer);
  } catch (error) {
    globalOcr.trabajador = undefined;
    try {
      return await reconocer(buffer);
    } catch {
      throw error;
    }
  }
}

export function precalentarOcr(): void {
  void obtenerTrabajador().catch(() => {
    globalOcr.trabajador = undefined;
  });
}

export async function cerrarOcr(): Promise<void> {
  const pendiente = globalOcr.trabajador;
  globalOcr.trabajador = undefined;
  if (!pendiente) return;
  try {
    const trabajador = await pendiente;
    await trabajador.terminate();
  } catch {
    // El worker ya no estaba disponible.
  }
}
