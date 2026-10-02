export function visionConfigurada(): boolean {
  return Boolean(process.env.VISION_API_KEY);
}

export interface LecturaVision {
  transcripcion: string;
  posibleEdicion: boolean;
}

const PROMPT = `Extraé el texto de un comprobante de SINPE Móvil de Costa Rica.
No inventes datos que no estén visibles. Conservá montos, fechas, horas, referencias, bancos y nombres tal como aparecen, incluso si la fecha es imposible.
Respondé SOLO con JSON válido, sin markdown, con esta forma exacta:
{"transcripcion":"texto completo con saltos de linea","posibleEdicion":false}
posibleEdicion es true solo si ves texto pegado, fuentes mezcladas o un borrado evidente.`;

function leerJson(texto: string): LecturaVision | null {
  const limpio = texto.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const inicio = limpio.indexOf("{");
  const fin = limpio.lastIndexOf("}");
  if (inicio < 0 || fin <= inicio) return null;
  try {
    const datos = JSON.parse(limpio.slice(inicio, fin + 1)) as {
      transcripcion?: unknown;
      posibleEdicion?: unknown;
    };
    if (typeof datos.transcripcion !== "string") return null;
    return {
      transcripcion: datos.transcripcion,
      posibleEdicion: datos.posibleEdicion === true,
    };
  } catch {
    return null;
  }
}

export async function extraerConVision(buffer: Buffer, mime: string): Promise<LecturaVision | null> {
  const clave = process.env.VISION_API_KEY;
  if (!clave) return null;

  const base = (process.env.VISION_API_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const modelo = process.env.VISION_MODEL || "gpt-4o-mini";
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), 20_000);

  try {
    const respuesta = await fetch(`${base}/chat/completions`, {
      method: "POST",
      signal: controlador.signal,
      headers: {
        Authorization: `Bearer ${clave}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelo,
        temperature: 0,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: PROMPT },
              {
                type: "image_url",
                image_url: { url: `data:${mime};base64,${buffer.toString("base64")}` },
              },
            ],
          },
        ],
      }),
    });
    if (!respuesta.ok) return null;
    const cuerpo = (await respuesta.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const contenido = cuerpo.choices?.[0]?.message?.content;
    if (typeof contenido !== "string") return null;
    return leerJson(contenido);
  } catch {
    return null;
  } finally {
    clearTimeout(temporizador);
  }
}
