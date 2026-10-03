import { analizarImagen } from "@/lib/analizar-imagen";
import { hashIp, ipDesdeRequest } from "@/lib/db";
import { esperaLegible, reglaLimite } from "@/lib/limite";
import { limitar, respuestaLimite } from "@/lib/limitador";
import { precalentarOcr } from "@/lib/ocr";
import { visionConfigurada } from "@/lib/vision";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAXIMO = 4 * 1024 * 1024;

function tipoDeImagen(buffer: Buffer): string | null {
  if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return "image/png";
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

export async function GET() {
  precalentarOcr();
  return Response.json({ ocr: "preparando", vision: visionConfigurada() });
}

export async function POST(request: Request) {
  // Este endpoint es el caro (OCR y, si hay llave, la API de visión): se limita antes de leer la imagen.
  const limite = await limitar(reglaLimite("analizar_ip"), hashIp(ipDesdeRequest(request)));
  if (!limite.permitido) {
    return respuestaLimite(
      `Ya analizaste varios comprobantes seguidos desde esta conexión. Esperá ${esperaLegible(limite.reintentarEnSeg)} y probá de nuevo.`,
      limite.reintentarEnSeg,
    );
  }

  let formulario: FormData;
  try {
    formulario = await request.formData();
  } catch {
    return Response.json(
      { error: "No pudimos leer el envío. Intentá con una imagen PNG o JPG." },
      { status: 400 },
    );
  }

  const archivo = formulario.get("imagen");
  if (!(archivo instanceof File)) {
    return Response.json({ error: "Subí la captura del comprobante." }, { status: 400 });
  }
  if (archivo.size > MAXIMO) {
    return Response.json(
      { error: "La imagen pesa más de 4 MB. Probá con una captura más liviana." },
      { status: 413 },
    );
  }

  const buffer = Buffer.from(await archivo.arrayBuffer());
  const mime = tipoDeImagen(buffer);
  if (!mime) {
    return Response.json({ error: "Necesitamos una imagen PNG, JPG o WebP." }, { status: 400 });
  }

  const mensajeCrudo = formulario.get("mensaje");
  const mensaje = typeof mensajeCrudo === "string" ? mensajeCrudo.slice(0, 2000) : "";

  try {
    const resultado = await analizarImagen(buffer, mime, mensaje);
    return Response.json(resultado);
  } catch (error) {
    console.error("Fallo al analizar comprobante", error);
    return Response.json(
      { error: "No pudimos leer la imagen en esta máquina. Probá de nuevo en un momento." },
      { status: 500 },
    );
  }
}
