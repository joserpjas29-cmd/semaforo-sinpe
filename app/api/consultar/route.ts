import { consultarNumero, hashIp, ipDesdeRequest } from "@/lib/db";
import { esperaLegible, reglaLimite } from "@/lib/limite";
import { limitar, respuestaLimite } from "@/lib/limitador";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // Primero el límite, antes de leer el cuerpo: frena también a quien recorre números en serie.
  const limite = await limitar(reglaLimite("consultar_ip"), hashIp(ipDesdeRequest(request)));
  if (!limite.permitido) {
    return respuestaLimite(
      `Hiciste muchas consultas seguidas desde esta conexión. Esperá ${esperaLegible(limite.reintentarEnSeg)} y probá de nuevo.`,
      limite.reintentarEnSeg,
    );
  }

  const cuerpo = (await request.json().catch(() => null)) as { telefono?: unknown } | null;
  const telefono = typeof cuerpo?.telefono === "string" ? cuerpo.telefono : "";
  const resultado = await consultarNumero(telefono);
  if (!resultado) {
    return Response.json(
      {
        error: "El celular de Costa Rica tiene 8 dígitos. Si viene con +506, lo podés pegar igual.",
      },
      { status: 400 },
    );
  }
  return Response.json(resultado);
}
