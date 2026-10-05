import { esperaLegible } from "./limite";

/** Aviso corto cuando no hay forma de decir cuántos minutos faltan. */
export const MENSAJE_DEMASIADOS_INTENTOS =
  "Demasiados intentos. Esperá unos minutos e intentá de nuevo.";

export interface AvisoLimite {
  status: number;
  retryAfter?: string | null;
  reintentarEnSeg?: unknown;
  /** Mensaje que ya trae el JSON, por si no viene Retry-After. */
  error?: unknown;
  ahora?: Date;
}

/**
 * Texto para un 429. Si la respuesta trae Retry-After (segundos o fecha HTTP),
 * el aviso dice cuánto falta. Si no, usa el error del JSON o una frase fija.
 * Devuelve null cuando el estado no es 429.
 */
export function mensajeLimite({
  status,
  retryAfter,
  reintentarEnSeg,
  error,
  ahora = new Date(),
}: AvisoLimite): string | null {
  if (status !== 429) return null;
  const segundos = segundosDeRetryAfter(retryAfter, ahora) ?? segundosDelCuerpo(reintentarEnSeg);
  if (segundos != null) return `Demasiados intentos. Volvé a intentar en ${esperaLegible(segundos)}.`;
  if (typeof error === "string" && error.trim()) return error.trim();
  return MENSAJE_DEMASIADOS_INTENTOS;
}

interface CuerpoJson {
  error?: unknown;
  reintentarEnSeg?: unknown;
}

/** Lee el JSON de una respuesta de la API y arma el error que debe ver la persona. */
export async function interpretarRespuesta<T>(
  respuesta: Response,
  generico: string,
): Promise<{ ok: true; datos: T } | { ok: false; error: string }> {
  const cuerpo = await leerCuerpo(respuesta);
  const limite = mensajeLimite({
    status: respuesta.status,
    retryAfter: respuesta.headers.get("Retry-After"),
    reintentarEnSeg: cuerpo?.reintentarEnSeg,
    error: cuerpo?.error,
  });
  if (limite) return { ok: false, error: limite };
  if (!respuesta.ok || !cuerpo) {
    const texto = typeof cuerpo?.error === "string" && cuerpo.error.trim() ? cuerpo.error.trim() : generico;
    return { ok: false, error: texto };
  }
  return { ok: true, datos: cuerpo as T };
}

async function leerCuerpo(respuesta: Response): Promise<CuerpoJson | null> {
  try {
    const datos = (await respuesta.json()) as unknown;
    if (!datos || typeof datos !== "object" || Array.isArray(datos)) return null;
    return datos as CuerpoJson;
  } catch {
    return null;
  }
}

function segundosDelCuerpo(valor: unknown): number | null {
  if (typeof valor !== "number" || !Number.isFinite(valor) || valor < 0) return null;
  return valor;
}

function segundosDeRetryAfter(valor: string | null | undefined, ahora: Date): number | null {
  if (valor == null) return null;
  const texto = valor.trim();
  if (!texto) return null;
  if (/^\d+$/.test(texto)) {
    const segundos = Number(texto);
    return Number.isFinite(segundos) ? segundos : null;
  }
  const instante = Date.parse(texto);
  if (!Number.isFinite(instante)) return null;
  return Math.max(0, Math.ceil((instante - ahora.getTime()) / 1000));
}
