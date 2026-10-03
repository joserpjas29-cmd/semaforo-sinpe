import { crearReporte, hashIp, ipDesdeRequest } from "@/lib/db";
import { respuestaLimite } from "@/lib/limitador";
import { esTipoReporte } from "@/lib/tipos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const cuerpo = (await request.json().catch(() => null)) as {
    telefono?: unknown;
    tipo?: unknown;
    descripcion?: unknown;
  } | null;

  const tipo = typeof cuerpo?.tipo === "string" ? cuerpo.tipo : "";
  if (!esTipoReporte(tipo)) {
    return Response.json({ error: "Elegí qué tipo de reporte querés dejar." }, { status: 400 });
  }

  const resultado = await crearReporte({
    telefono: typeof cuerpo?.telefono === "string" ? cuerpo.telefono : "",
    tipo,
    descripcion: typeof cuerpo?.descripcion === "string" ? cuerpo.descripcion : "",
    ipHash: hashIp(ipDesdeRequest(request)),
  });

  if (!resultado.ok) {
    if (resultado.codigo === "limite") return respuestaLimite(resultado.error, resultado.reintentarEnSeg);
    return Response.json({ error: resultado.error }, { status: 400 });
  }

  return Response.json(resultado);
}
