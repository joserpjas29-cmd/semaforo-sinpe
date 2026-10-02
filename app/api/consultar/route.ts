import { consultarNumero } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
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
