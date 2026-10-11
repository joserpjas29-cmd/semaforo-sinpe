"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { CampoTelefono, presentarEntrada } from "@/components/campo-telefono";
import { Encabezado } from "@/components/encabezado";
import { clsBoton, clsFoco } from "@/components/estilos";
import { interpretarRespuesta } from "@/lib/mensaje-limite";
import { formatearTelefono, normalizarTelefono } from "@/lib/telefono";
import { ETIQUETA_TIPO, TIPOS_REPORTE, type TipoReporte } from "@/lib/tipos";
import { SelloStellar } from "@/components/sello-stellar";
import { sellosParaMostrar, type SelloVisible } from "@/lib/sello-vista";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const AYUDA: Record<TipoReporte, string> = {
  comprobante_falso: "Te mandaron una captura y la plata no entró.",
  numero_reciclado: "El número era de otra persona o cambió de dueño.",
  pidio_devolucion: "Depositaron y pidieron que les devolvieras.",
  otro: "Pasó algo raro que no cabe en las otras.",
};

export function ReportarForm({ numeroInicial = "" }: { numeroInicial?: string }) {
  const normalizado = normalizarTelefono(numeroInicial);
  const [telefono, setTelefono] = useState(normalizado ? formatearTelefono(normalizado) : presentarEntrada(numeroInicial));
  const [tipo, setTipo] = useState<TipoReporte | "">("");
  const [descripcion, setDescripcion] = useState("");
  const [error, setError] = useState("");
  const [exito, setExito] = useState<{ telefono: string; sello: SelloVisible | null } | null>(null);
  const [cargando, setCargando] = useState(false);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setError("");
    if (!tipo) {
      setError("Elegí qué tipo de reporte querés dejar.");
      return;
    }
    setCargando(true);
    try {
      const respuesta = await fetch("/api/reportar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telefono, tipo, descripcion }),
      });
      const leido = await interpretarRespuesta<{ telefono?: string; sello?: SelloVisible | null }>(
        respuesta,
        "No se pudo guardar el reporte.",
      );
      if (!leido.ok) {
        setError(leido.error);
        return;
      }
      if (!leido.datos.telefono) {
        setError("No se pudo guardar el reporte.");
        return;
      }
      const sellos = sellosParaMostrar(leido.datos.sello ? [leido.datos.sello] : []);
      setExito({ telefono: leido.datos.telefono, sello: sellos[0] ?? null });
    } catch {
      setError("No hay conexión con la herramienta. Probá de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  if (exito) {
    return (
      <div className="mx-auto flex min-h-full w-full max-w-xl flex-1 flex-col items-start justify-center gap-4 py-10 lg:min-h-0">
        <span className="flex size-16 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <ShieldCheck className="size-8" aria-hidden />
        </span>
        <h1 className="text-[28px] font-extrabold tracking-tight text-foreground">El reporte ya está en la lista</h1>
        <p className="text-[15px] leading-relaxed text-muted-foreground">
          Quien consulte {formatearTelefono(exito.telefono)} va a ver este aviso en el semáforo. No publicamos el texto
          que escribiste.
        </p>
        {exito.sello && <SelloStellar sellos={[exito.sello]} />}
        <Link href={`/consultar?numero=${exito.telefono}`} className={clsBoton}>
          Ver el semáforo de este número
        </Link>
        <button
          type="button"
          className="text-[15px] font-semibold text-link"
          onClick={() => {
            setExito(null);
            setDescripcion("");
            setTipo("");
          }}
        >
          Reportar otro
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-5xl flex-1 flex-col lg:min-h-0">
      <Encabezado titulo="Reportar número" texto="Tu reporte ayuda a proteger a otras personas." />

      <aside className="mt-4 rounded-[16px] border border-border bg-card px-4 py-3 text-sm leading-relaxed text-muted-foreground">
        <p className="font-semibold text-foreground">Privacidad</p>
        <p className="mt-1">
          No guardamos el número en claro: solo un código HMAC irreversible, que no se puede volver a leer. Guardamos
          el tipo, tu descripción y la hora. No te pedimos nombre, y el reporte no guarda la dirección de tu conexión
          ni un código de ella. En la consulta pública se ven cantidades y tipos, no el texto libre. Si el sello de
          Stellar está activo, a la red de pruebas se publica solo un hash: nunca el número ni lo que escribiste.
        </p>
      </aside>

      <form
        className="mt-5 flex flex-1 flex-col lg:grid lg:flex-none lg:grid-cols-2 lg:items-start lg:gap-8"
        onSubmit={(evento) => void enviar(evento)}
      >
        <div>
        <label htmlFor="telefono" className="sr-only">
          Número
        </label>
        <CampoTelefono id="telefono" value={telefono} onChange={setTelefono} tono="suave" />

        <fieldset className="mt-6">
          <legend className="text-[15px] font-bold text-foreground">¿Qué pasó?</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {TIPOS_REPORTE.map((opcion) => {
              const activo = tipo === opcion;
              return (
                <button
                  key={opcion}
                  type="button"
                  aria-pressed={activo}
                  onClick={() => setTipo(opcion)}
                  className={cn(
                    "rounded-full border px-3 py-2 text-sm font-medium",
                    clsFoco,
                    activo
                      ? "border-link bg-card text-link"
                      : "border-border bg-card text-foreground",
                  )}
                >
                  {ETIQUETA_TIPO[opcion]}
                </button>
              );
            })}
          </div>
          {tipo && <p className="mt-2 text-sm text-muted-foreground">{AYUDA[tipo]}</p>}
        </fieldset>
        </div>

        <div className="mt-5 flex flex-1 flex-col gap-2 lg:mt-0">
          <label htmlFor="descripcion" className="text-[15px] font-bold text-foreground">
            Comentario
          </label>
          <textarea
            id="descripcion"
            name="descripcion"
            value={descripcion}
            onChange={(evento) => setDescripcion(evento.target.value)}
            placeholder="Contanos brevemente qué pasó..."
            className="min-h-28 w-full resize-none rounded-[16px] border border-input bg-card px-4 py-3 text-[15px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-link lg:min-h-40"
            required
            minLength={12}
            maxLength={400}
          />
          <p className="text-sm text-muted-foreground">
            Hace falta una frase de al menos 12 caracteres. No pongas cédulas ni cuentas.
          </p>

          {error && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {error}
            </p>
          )}

          <div className="mt-auto pt-8 lg:pt-3">
            <button type="submit" disabled={cargando} className={clsBoton}>
              {cargando ? "Guardando…" : "Enviar reporte"}
            </button>
            <p className="mt-3 text-center text-xs leading-relaxed text-muted-foreground">
              Hay un límite de reportes por conexión para evitar abusos. Los ejemplos de la demo no cuentan como tuyos.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
