"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type DragEvent, type FormEvent } from "react";
import { ImageIcon, Upload } from "lucide-react";
import { Encabezado } from "@/components/encabezado";
import { clsBoton, clsEnlace, clsFoco } from "@/components/estilos";
import { Recordatorio } from "@/components/recordatorio";
import { ResultadoRiesgo, type LineaResultado } from "@/components/resultado-riesgo";
import type { FuenteLectura } from "@/lib/analizar-imagen";
import { COMPROBANTES_DEMO, MENSAJES_DEMO } from "@/lib/ejemplos";
import { formatearColones } from "@/lib/formato";
import { guardarHistorial } from "@/lib/historial-local";
import { interpretarRespuesta } from "@/lib/mensaje-limite";
import { RECORDATORIO_RECIBO, type ResultadoComprobante, type Severidad } from "@/lib/tipos";
import { cn } from "@/lib/utils";

interface Analisis extends ResultadoComprobante {
  fuente: FuenteLectura;
  visionDisponible: boolean;
}

const LLAMADO = {
  rojo: "No des el producto por pagado hasta ver la plata en tu banco.",
  amarillo: "Hay algo que no cierra. Confirmá el depósito en tu banco.",
  verde: "Verde no alcanza: un pantallazo no es plata en la cuenta.",
} as const;

const SEVERIDAD: Record<Severidad, string> = {
  alta: "Alta",
  media: "Media",
};

function textoLectura(fuente: FuenteLectura, visionDisponible: boolean, confianza: number | null): string {
  const base =
    fuente === "vision"
      ? "Lectura con modelo de visión."
      : fuente === "ejemplo"
        ? "Lectura del texto de la captura de ejemplo, para que la demo no dependa del arranque del OCR."
        : fuente === "respaldo"
          ? "El lector de la imagen no respondió. El semáforo sale del mensaje y no da luz verde por la captura."
          : "Lectura con OCR local.";
  const vision = visionDisponible ? "" : " No hay API key de visión configurada.";
  const confianzaTexto = confianza != null ? ` Confianza aproximada del OCR: ${Math.round(confianza)}%.` : "";
  return `${base}${vision}${confianzaTexto}`;
}

export function ComprobanteForm() {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const previewRef = useRef<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [mensaje, setMensaje] = useState("");
  const [ejemplos, setEjemplos] = useState(false);
  const [resultado, setResultado] = useState<Analisis | null>(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    void fetch("/api/analizar").catch(() => undefined);
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);

  function mostrarArchivo(nuevo: File | null) {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const url = nuevo ? URL.createObjectURL(nuevo) : null;
    previewRef.current = url;
    setPreview(url);
    setArchivo(nuevo);
    setResultado(null);
  }

  async function usarEjemplo(src: string, nombre: string) {
    setError("");
    const respuesta = await fetch(src);
    const blob = await respuesta.blob();
    mostrarArchivo(new File([blob], nombre, { type: blob.type || "image/png" }));
    setEjemplos(false);
  }

  function soltar(evento: DragEvent) {
    evento.preventDefault();
    const nuevo = evento.dataTransfer.files?.[0];
    if (nuevo) mostrarArchivo(nuevo);
  }

  async function analizar(evento: FormEvent) {
    evento.preventDefault();
    if (!archivo) {
      setError("Subí una captura o elegí uno de los comprobantes de ejemplo.");
      inputRef.current?.click();
      return;
    }
    setCargando(true);
    setError("");
    setResultado(null);
    try {
      const formulario = new FormData();
      formulario.set("imagen", archivo);
      formulario.set("mensaje", mensaje);
      const respuesta = await fetch("/api/analizar", { method: "POST", body: formulario });
      const leido = await interpretarRespuesta<Analisis>(respuesta, "No se pudo analizar.");
      if (!leido.ok) {
        setError(leido.error);
        return;
      }
      setResultado(leido.datos);
      guardarHistorial({
        tipo: "comprobante",
        color: leido.datos.color,
        titulo: leido.datos.titulo,
      });
    } catch {
      setError("No hay conexión con la herramienta. Probá de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  const datos = resultado?.datos;
  const lineas: LineaResultado[] =
    resultado && resultado.senales.length > 0
      ? resultado.senales.map((senal) => ({
          id: senal.id,
          titulo: senal.titulo,
          detalle: senal.detalle,
          etiqueta: SEVERIDAD[senal.severidad],
        }))
      : resultado
        ? [
            {
              id: "sin-senales",
              titulo: "No vimos señales de alarma en lo que se pudo leer.",
              detalle: "Eso no alcanza para entregar el producto. El depósito se confirma en tu banco, no en el chat.",
            },
          ]
        : [];

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Encabezado
        titulo="Comprobante"
        texto="Subí una imagen del comprobante que querés verificar."
      />

      <form className="mt-6 flex flex-1 flex-col" onSubmit={(evento) => void analizar(evento)}>
        <input
          ref={inputRef}
          id="imagen"
          name="imagen"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={(evento) => mostrarArchivo(evento.target.files?.[0] ?? null)}
        />

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(evento) => evento.preventDefault()}
          onDrop={soltar}
          className={cn(
            "flex min-h-[260px] w-full flex-col items-center justify-center rounded-[24px] border border-dashed border-[#CBD5E1] bg-white px-6 py-8 text-center",
            clsFoco,
          )}
        >
          {preview ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Vista previa del comprobante que se va a analizar" className="max-h-48 rounded-xl object-contain" />
              <span className="mt-3 text-sm font-semibold text-[#0F172A]">{archivo?.name}</span>
              <span className="mt-1 text-sm text-[#64748B]">Tocá para cambiar la imagen</span>
            </>
          ) : (
            <>
              <ImageIcon className="size-10 text-[#0D9488]" strokeWidth={1.6} aria-hidden />
              <span className="mt-4 text-base font-bold text-[#0F172A]">Seleccionar imagen</span>
              <span className="mt-1 text-sm text-[#64748B]">JPG, PNG o WebP</span>
              <span className="mt-1 text-sm text-[#94A3B8]">Tocá para elegir desde tu galería</span>
            </>
          )}
        </button>

        {archivo && (
          <div className="mt-4 space-y-2">
            <label htmlFor="mensaje" className="text-sm font-semibold text-[#0F172A]">
              Mensaje del cliente (opcional)
            </label>
            <textarea
              id="mensaje"
              name="mensaje"
              value={mensaje}
              onChange={(evento) => setMensaje(evento.target.value)}
              placeholder="Pegá acá el texto del chat, si te escribió algo."
              className="min-h-24 w-full resize-none rounded-[16px] border border-[#E2E8F0] bg-white px-4 py-3 text-[15px] leading-relaxed text-[#0F172A] outline-none placeholder:text-[#94A3B8] focus-visible:border-[#1D4ED8]"
            />
            <div className="flex flex-wrap gap-2">
              {MENSAJES_DEMO.map((muestra) => (
                <button
                  key={muestra.id}
                  type="button"
                  onClick={() => setMensaje(muestra.texto)}
                  className={cn(
                    "rounded-full border border-[#E2E8F0] bg-white px-3 py-1.5 text-sm font-medium text-[#0F172A]",
                    clsFoco,
                  )}
                >
                  {muestra.etiqueta}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <p role="alert" className="mt-3 text-sm font-medium text-[#DC2626]">
            {error}
          </p>
        )}

        <div className="mt-auto space-y-3 pt-8">
          <Recordatorio texto={RECORDATORIO_RECIBO} titulo="Confirmá el depósito en tu banco" />
          {archivo ? (
            <button type="submit" disabled={cargando} className={clsBoton}>
              {cargando ? "Leyendo el comprobante…" : "Analizar"}
            </button>
          ) : (
            <button type="button" onClick={() => inputRef.current?.click()} className={clsBoton}>
              <Upload className="size-4" aria-hidden />
              Galería
            </button>
          )}
          {cargando && (
            <p className="text-center text-sm text-[#64748B]">
              La primera vez tarda un toque más, porque el lector de texto arranca en esta máquina.
            </p>
          )}
          <button type="button" onClick={() => setEjemplos((valor) => !valor)} className={cn(clsEnlace, "w-full")}>
            {ejemplos ? "Ocultar ejemplos" : "Usar comprobante de ejemplo"}
          </button>
          {ejemplos && (
            <ul className="space-y-2">
              {COMPROBANTES_DEMO.map((ejemplo) => (
                <li key={ejemplo.src}>
                  <button
                    type="button"
                    onClick={() => void usarEjemplo(ejemplo.src, ejemplo.archivo)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-[16px] border border-[#E2E8F0] bg-white p-3 text-left",
                      clsFoco,
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={ejemplo.src} alt="" className="h-16 w-12 rounded-md object-cover object-top" />
                    <span>
                      <span className="block text-sm font-semibold text-[#0F172A]">{ejemplo.titulo}</span>
                      <span className="mt-0.5 block text-sm text-[#64748B]">{ejemplo.detalle}</span>
                    </span>
                  </button>
                </li>
              ))}
              <li className="text-xs leading-relaxed text-[#94A3B8]">Imágenes ficticias. No son comprobantes reales.</li>
            </ul>
          )}
        </div>
      </form>

      {resultado && datos && (
        <ResultadoRiesgo
          color={resultado.color}
          titulo={resultado.titulo}
          explicacion={resultado.explicacion}
          lineas={lineas}
          banner={LLAMADO[resultado.color]}
          nota={resultado.recordatorio}
          onCerrar={() => setResultado(null)}
          extra={
            <div className="rounded-[16px] border border-[#E2E8F0] bg-white p-4">
              <h3 className="text-sm font-semibold text-[#0F172A]">Lo que se pudo leer</h3>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-[#64748B]">Monto</dt>
                  <dd className="font-medium text-[#0F172A]">{datos.monto == null ? "No se leyó" : formatearColones(datos.monto)}</dd>
                </div>
                <div>
                  <dt className="text-[#64748B]">Fecha y hora</dt>
                  <dd className="font-medium text-[#0F172A]">
                    {[datos.fechaTexto, datos.horaTexto].filter(Boolean).join(" · ") || "No se leyó"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#64748B]">Referencia</dt>
                  <dd className="font-medium break-all text-[#0F172A]">{datos.referencia ?? "No se leyó"}</dd>
                </div>
                <div>
                  <dt className="text-[#64748B]">Banco</dt>
                  <dd className="font-medium text-[#0F172A]">{datos.bancos.length ? datos.bancos.join(", ") : "No se leyó"}</dd>
                </div>
                <div>
                  <dt className="text-[#64748B]">De</dt>
                  <dd className="font-medium text-[#0F172A]">{datos.nombreOrigen ?? "No se leyó"}</dd>
                </div>
                <div>
                  <dt className="text-[#64748B]">Para</dt>
                  <dd className="font-medium text-[#0F172A]">{datos.nombreDestino ?? "No se leyó"}</dd>
                </div>
              </dl>
              <p className="mt-3 text-xs leading-relaxed text-[#64748B]">
                {textoLectura(resultado.fuente, resultado.visionDisponible, datos.confianza)}
              </p>
            </div>
          }
          acciones={
            <>
              <button type="button" onClick={() => setResultado(null)} className={clsBoton}>
                Revisar otro
              </button>
              <Link href="/" className={clsEnlace}>
                Volver al inicio
              </Link>
            </>
          }
        />
      )}
    </div>
  );
}
