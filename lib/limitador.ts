import { obtenerAlmacen, type ResultadoLimite } from "./almacen";
import type { ReglaLimite } from "./limite";

/**
 * Pide un lugar en el límite. Si la base falla, deja pasar y lo registra: es mejor que
 * la app siga atendiendo a que un fallo del contador la deje sin servicio.
 */
export async function limitar(regla: ReglaLimite, clave: string, ahora = new Date()): Promise<ResultadoLimite> {
  try {
    const almacen = await obtenerAlmacen();
    return await almacen.consumirLimite({
      accion: regla.accion,
      clave,
      maximo: regla.maximo,
      ventanaMs: regla.ventanaMs,
      ahora,
    });
  } catch (error) {
    console.error(`No pude comprobar el límite ${regla.accion}. Dejo pasar la petición.`, error);
    return { permitido: true, reintentarEnSeg: 0 };
  }
}

/** Respuesta 429 con el mismo formato `{ error }` que usan las demás rutas, y la cabecera estándar Retry-After. */
export function respuestaLimite(error: string, reintentarEnSeg: number): Response {
  return Response.json(
    { error, reintentarEnSeg },
    { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil(reintentarEnSeg))) } },
  );
}
