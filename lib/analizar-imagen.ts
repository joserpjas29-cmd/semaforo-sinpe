import { analizarComprobante } from "./comprobante";
import { textoDeEjemplo } from "./ejemplos-texto";
import { leerImagen, OCR_TOPE_MS } from "./ocr";
import type { ResultadoComprobante } from "./tipos";
import { extraerConVision, visionConfigurada } from "./vision";

export type FuenteLectura = "vision" | "ocr" | "ejemplo" | "respaldo";

export interface AnalisisImagen extends ResultadoComprobante {
  fuente: FuenteLectura;
  visionDisponible: boolean;
}

function conTope<T>(promesa: Promise<T>, milisegundos: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const temporizador = setTimeout(() => reject(new Error("ocr-timeout")), milisegundos);
    promesa.then(
      (valor) => {
        clearTimeout(temporizador);
        resolve(valor);
      },
      (error: unknown) => {
        clearTimeout(temporizador);
        reject(error);
      },
    );
  });
}

export async function analizarImagen(
  buffer: Buffer,
  mime: string,
  mensaje: string,
): Promise<AnalisisImagen> {
  const visionDisponible = visionConfigurada();
  const vision = await extraerConVision(buffer, mime);

  if (vision && vision.transcripcion.trim().length >= 12) {
    const resultado = analizarComprobante(vision.transcripcion, mensaje, {
      posibleEdicion: vision.posibleEdicion,
    });
    return { ...resultado, fuente: "vision", visionDisponible };
  }

  const ejemplo = textoDeEjemplo(buffer);
  if (ejemplo) {
    const resultado = analizarComprobante(ejemplo, mensaje);
    return { ...resultado, fuente: "ejemplo", visionDisponible };
  }

  try {
    const ocr = await conTope(leerImagen(buffer), OCR_TOPE_MS);
    const resultado = analizarComprobante(ocr.texto, mensaje, {
      confianzaGlobal: ocr.confianza,
      palabras: ocr.palabras,
    });
    return { ...resultado, fuente: "ocr", visionDisponible };
  } catch (error) {
    console.error("OCR no disponible, sigo con el mensaje", error);
    const resultado = analizarComprobante("", mensaje);
    return { ...resultado, fuente: "respaldo", visionDisponible };
  }
}
