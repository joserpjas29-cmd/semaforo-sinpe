"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatearTelefono } from "@/lib/telefono";
import { ETIQUETA_TIPO, TIPOS_REPORTE, type TipoReporte } from "@/lib/tipos";

const AYUDA: Record<TipoReporte, string> = {
  comprobante_falso: "Te mandaron una captura y la plata no entró.",
  numero_reciclado: "El número era de otra persona o cambió de dueño.",
  pidio_devolucion: "Depositaron y pidieron que les devolvieras.",
  otro: "Pasó algo raro que no cabe en las otras.",
};

export function ReportarForm({ numeroInicial = "" }: { numeroInicial?: string }) {
  const [telefono, setTelefono] = useState(numeroInicial);
  const [tipo, setTipo] = useState<TipoReporte | "">("");
  const [descripcion, setDescripcion] = useState("");
  const [error, setError] = useState("");
  const [exito, setExito] = useState<string | null>(null);
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
      const datos = (await respuesta.json()) as { error?: string; telefono?: string };
      if (!respuesta.ok || !datos.telefono) {
        setError(datos.error || "No se pudo guardar el reporte.");
        return;
      }
      setExito(datos.telefono);
    } catch {
      setError("No hay conexión con la herramienta. Probá de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  if (exito) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 py-8">
        <p className="text-sm font-semibold tracking-[0.14em] text-primary uppercase">Listo</p>
        <h1 className="font-heading text-4xl">El reporte ya está en la lista</h1>
        <p className="leading-relaxed text-muted-foreground">
          Quien consulte {formatearTelefono(exito)} va a ver este aviso en el semáforo. No publicamos
          el texto que escribiste.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button render={<Link href={`/consultar?numero=${exito}`} />} nativeButton={false} className="h-12 text-base">
            Ver el semáforo de este número
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-12 bg-card text-base"
            onClick={() => {
              setExito(null);
              setDescripcion("");
              setTipo("");
            }}
          >
            Reportar otro
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-8">
      <header className="space-y-2">
        <p className="text-sm font-semibold tracking-[0.14em] text-primary uppercase">Si te pasó</p>
        <h1 className="font-heading text-4xl text-balance">Reportá un número</h1>
        <p className="leading-relaxed text-muted-foreground">
          Cada reporte alimenta la consulta. Contá lo justo: el número, el tipo y una frase. No pongas
          cédulas, cuentas ni nombres de terceros si no hacen falta.
        </p>
      </header>

      <aside className="rounded-2xl bg-muted px-4 py-3 text-sm leading-relaxed text-muted-foreground">
        <p className="font-semibold text-foreground">Privacidad</p>
        <p className="mt-1">
          Guardamos el número, el tipo, tu descripción y la hora. No te pedimos nombre. La dirección de
          la conexión se guarda solo como un código irreversible, para frenar spam, y no se muestra. En
          la consulta pública se ven cantidades y tipos, no el texto libre.
        </p>
      </aside>

      <form className="space-y-5" onSubmit={(evento) => void enviar(evento)}>
        <div className="space-y-2">
          <Label htmlFor="telefono">Número</Label>
          <Input
            id="telefono"
            name="telefono"
            inputMode="numeric"
            autoComplete="tel"
            placeholder="8888 0000"
            value={telefono}
            onChange={(evento) => setTelefono(evento.target.value)}
            className="h-12 px-3 text-base md:text-base"
            required
          />
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">¿Qué pasó?</legend>
          <div className="grid gap-2">
            {TIPOS_REPORTE.map((opcion) => (
              <label
                key={opcion}
                className={`flex cursor-pointer gap-3 rounded-2xl px-3 py-3 ring-1 ring-foreground/10 ${
                  tipo === opcion ? "bg-accent ring-primary" : "bg-card"
                }`}
              >
                <input
                  type="radio"
                  name="tipo"
                  value={opcion}
                  checked={tipo === opcion}
                  onChange={() => setTipo(opcion)}
                  className="mt-1 accent-[var(--primary)]"
                />
                <span>
                  <span className="block font-medium">{ETIQUETA_TIPO[opcion]}</span>
                  <span className="block text-sm text-muted-foreground">{AYUDA[opcion]}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="space-y-2">
          <Label htmlFor="descripcion">Qué pasó, en breve</Label>
          <Textarea
            id="descripcion"
            name="descripcion"
            value={descripcion}
            onChange={(evento) => setDescripcion(evento.target.value)}
            placeholder="Me mandó la captura a las 3 p. m. y en el banco no aparece nada."
            className="min-h-28 text-base md:text-base"
            required
            minLength={12}
            maxLength={400}
          />
        </div>

        {error && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        )}

        <Button type="submit" disabled={cargando} className="h-12 w-full text-base">
          {cargando ? "Guardando…" : "Enviar reporte"}
        </Button>
        <p className="text-sm text-muted-foreground">
          Hay un límite de reportes por conexión para evitar abusos. Los ejemplos de la demo no cuentan
          como tuyos.
        </p>
      </form>
    </div>
  );
}
