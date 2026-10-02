"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Recordatorio } from "@/components/recordatorio";
import { Semaforo } from "@/components/semaforo";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { FuenteLectura } from "@/lib/analizar-imagen";
import { COMPROBANTES_DEMO, MENSAJES_DEMO } from "@/lib/ejemplos";
import { formatearColones } from "@/lib/formato";
import { RECORDATORIO_RECIBO, type ResultadoComprobante, type Severidad } from "@/lib/tipos";

interface Analisis extends ResultadoComprobante {
  fuente: FuenteLectura;
  visionDisponible: boolean;
}

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

const SEVERIDAD: Record<Severidad, string> = {
  alta: "Alta",
  media: "Media",
};

export function ComprobanteForm() {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const previewRef = useRef<string | null>(null);
  const [mensaje, setMensaje] = useState("");
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
  }

  async function analizar(evento: FormEvent) {
    evento.preventDefault();
    if (!archivo) {
      setError("Subí una captura o elegí uno de los comprobantes de ejemplo.");
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
      const datos = (await respuesta.json()) as Analisis & { error?: string };
      if (!respuesta.ok) {
        setError(datos.error || "No se pudo analizar.");
        return;
      }
      setResultado(datos);
    } catch {
      setError("No hay conexión con la herramienta. Probá de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  const datos = resultado?.datos;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-8">
      <header className="space-y-2">
        <p className="text-sm font-semibold tracking-[0.14em] text-primary uppercase">Al recibir un pago</p>
        <h1 className="font-heading text-4xl text-balance">Analizá el comprobante</h1>
        <p className="leading-relaxed text-muted-foreground">
          Subí la captura que te mandó el cliente y, si querés, pegá el mensaje. La lectura se hace en
          el servidor de esta herramienta. Sin una API key de visión, la imagen no se manda a un modelo
          externo.
        </p>
      </header>

      <Recordatorio texto={RECORDATORIO_RECIBO} titulo="Confirmá el depósito en tu banca" />

      <form className="space-y-5" onSubmit={(evento) => void analizar(evento)}>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Comprobantes ficticios</legend>
          <ul className="grid gap-2">
            {COMPROBANTES_DEMO.map((ejemplo) => (
              <li key={ejemplo.src}>
                <button
                  type="button"
                  onClick={() => void usarEjemplo(ejemplo.src, ejemplo.archivo)}
                  className="flex w-full items-start gap-3 rounded-2xl bg-card p-3 text-left ring-1 ring-foreground/10 focus-visible:ring-3 focus-visible:ring-ring"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ejemplo.src} alt="" className="h-16 w-12 rounded-md object-cover object-top" />
                  <span>
                    <span className="block text-sm font-semibold">{ejemplo.titulo}</span>
                    <span className="mt-0.5 block text-sm text-muted-foreground">{ejemplo.detalle}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">Imágenes generadas para la demo. No son comprobantes reales.</p>
        </fieldset>

        <div className="space-y-2">
          <Label htmlFor="imagen">O subí tu captura</Label>
          <input
            id="imagen"
            name="imagen"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="block w-full rounded-lg border border-input bg-card px-3 py-3 text-base file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-foreground"
            onChange={(evento) => {
              mostrarArchivo(evento.target.files?.[0] ?? null);
            }}
          />
        </div>

        {preview && (
          <figure className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Vista previa del comprobante que se va a analizar" className="max-h-80 w-full object-contain" />
            <figcaption className="px-3 py-2 text-sm text-muted-foreground">{archivo?.name}</figcaption>
          </figure>
        )}

        <div className="space-y-2">
          <Label htmlFor="mensaje">Mensaje del cliente, si te escribió algo</Label>
          <Textarea
            id="mensaje"
            name="mensaje"
            value={mensaje}
            onChange={(evento) => setMensaje(evento.target.value)}
            placeholder="Pegá acá el texto del chat. Es opcional."
            className="min-h-28 text-base md:text-base"
          />
          <div className="flex flex-wrap gap-2">
            {MENSAJES_DEMO.map((muestra) => (
              <Button
                key={muestra.id}
                type="button"
                variant="outline"
                className="h-10 bg-card"
                onClick={() => setMensaje(muestra.texto)}
              >
                {muestra.etiqueta}
              </Button>
            ))}
          </div>
        </div>

        {error && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        )}

        <Button type="submit" disabled={cargando} className="h-12 w-full text-base">
          {cargando ? "Leyendo el comprobante…" : "Analizar"}
        </Button>
        {cargando && (
          <p className="text-sm text-muted-foreground">
            La primera vez tarda un toque más, porque el lector de texto arranca en esta máquina.
          </p>
        )}
      </form>

      {cargando && <Semaforo pulso titulo="Leyendo la captura" detalle="Estamos sacando monto, fecha, referencia y banco." />}

      {resultado && datos && (
        <section className="space-y-5 rounded-3xl bg-card p-5 ring-1 ring-foreground/10" aria-label="Resultado del comprobante">
          <Semaforo color={resultado.color} titulo={resultado.titulo} detalle={resultado.explicacion} />
          <Recordatorio texto={resultado.recordatorio} titulo="Confirmá el depósito en tu banca" />

          <div>
            <h3 className="text-sm font-semibold">Lo que se pudo leer</h3>
            <dl className="mt-2 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Monto</dt>
                <dd className="font-medium">{datos.monto == null ? "No se leyó" : formatearColones(datos.monto)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Fecha y hora</dt>
                <dd className="font-medium">
                  {[datos.fechaTexto, datos.horaTexto].filter(Boolean).join(" · ") || "No se leyó"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Referencia</dt>
                <dd className="font-medium break-all">{datos.referencia ?? "No se leyó"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Banco</dt>
                <dd className="font-medium">{datos.bancos.length ? datos.bancos.join(", ") : "No se leyó"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">De</dt>
                <dd className="font-medium">{datos.nombreOrigen ?? "No se leyó"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Para</dt>
                <dd className="font-medium">{datos.nombreDestino ?? "No se leyó"}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">
              {textoLectura(resultado.fuente, resultado.visionDisponible, datos.confianza)}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold">
              {resultado.senales.length === 0 ? "No vimos señales de alarma" : "Señales"}
            </h3>
            {resultado.senales.length === 0 ? (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Eso no alcanza para entregar el producto. El depósito se confirma en tu banca, no en el chat.
              </p>
            ) : (
              <ul className="mt-2 space-y-2">
                {resultado.senales.map((senal) => (
                  <li key={senal.id} className="rounded-2xl bg-muted px-3 py-3">
                    <p className="text-xs font-semibold tracking-wide uppercase">
                      {SEVERIDAD[senal.severidad]}
                      <span className="sr-only">.</span>
                    </p>
                    <p className="mt-1 font-medium">{senal.titulo}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{senal.detalle}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
