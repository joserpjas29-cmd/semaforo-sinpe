"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Recordatorio } from "@/components/recordatorio";
import { Semaforo } from "@/components/semaforo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NUMEROS_DEMO } from "@/lib/ejemplos";
import { interpretarRespuesta } from "@/lib/mensaje-limite";
import { formatearTelefono, normalizarTelefono } from "@/lib/telefono";
import { ETIQUETA_TIPO, RECORDATORIO_ENVIO, TIPOS_REPORTE, type ResultadoNumero } from "@/lib/tipos";

interface Consulta extends ResultadoNumero {
  telefono: string;
  telefonoFormateado: string;
  esEjemplo: boolean;
  pareceCelular: boolean;
  recordatorio: string;
}

export function ConsultarForm({ numeroInicial = "" }: { numeroInicial?: string }) {
  const normalizadoInicial = normalizarTelefono(numeroInicial);
  const [telefono, setTelefono] = useState(normalizadoInicial ? formatearTelefono(normalizadoInicial) : numeroInicial);
  const [resultado, setResultado] = useState<Consulta | null>(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (numeroInicial.trim()) {
      void consultar(numeroInicial);
    }
    // La consulta inicial solo corre al abrir la página con ?numero=
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function consultar(valor: string) {
    setCargando(true);
    setError("");
    setResultado(null);
    try {
      const respuesta = await fetch("/api/consultar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telefono: valor }),
      });
      const leido = await interpretarRespuesta<Consulta>(respuesta, "No se pudo consultar.");
      if (!leido.ok) {
        setError(leido.error);
        return;
      }
      setResultado(leido.datos);
    } catch {
      setError("No hay conexión con la herramienta. Probá de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-8">
      <header className="space-y-2">
        <p className="text-sm font-semibold tracking-[0.14em] text-primary uppercase">Antes de enviar</p>
        <h1 className="font-heading text-4xl text-balance">Consultá el número</h1>
        <p className="leading-relaxed text-muted-foreground">
          Ingresá el celular al que le vas a hacer el SINPE. El semáforo sale de los reportes de
          otras personas.
        </p>
      </header>

      <Recordatorio texto={RECORDATORIO_ENVIO} titulo="Verificá el nombre en tu banco" />

      <form
        className="space-y-4"
        onSubmit={(evento) => {
          evento.preventDefault();
          void consultar(telefono);
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="telefono">Número de celular</Label>
          <Input
            id="telefono"
            name="telefono"
            inputMode="numeric"
            autoComplete="tel"
            placeholder="8888 0000"
            value={telefono}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "error-telefono" : "ayuda-telefono"}
            onChange={(evento) => setTelefono(evento.target.value)}
            className="h-12 px-3 text-base md:text-base"
          />
          <p id="ayuda-telefono" className="text-sm text-muted-foreground">
            8 dígitos. Si lo copiás con +506, también sirve.
          </p>
        </div>
        {error && (
          <p id="error-telefono" role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" disabled={cargando} className="h-12 w-full text-base">
          {cargando ? "Consultando…" : "Ver el semáforo"}
        </Button>
      </form>

      <div>
        <p className="text-sm font-medium">Probá con un número ficticio</p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {NUMEROS_DEMO.map((numero) => (
            <li key={numero.telefono}>
              <Button
                type="button"
                variant="outline"
                className="h-10 bg-card"
                onClick={() => {
                  setTelefono(formatearTelefono(numero.telefono));
                  void consultar(numero.telefono);
                }}
              >
                {formatearTelefono(numero.telefono)}
              </Button>
            </li>
          ))}
        </ul>
      </div>

      {cargando && <Semaforo pulso titulo="Consultando la lista" detalle="Estamos juntando los reportes de este número." />}

      {resultado && (
        <section className="space-y-5 rounded-3xl bg-card p-5 ring-1 ring-foreground/10" aria-label="Resultado de la consulta">
          {resultado.esEjemplo && (
            <p className="rounded-full bg-muted px-3 py-1 text-center text-xs font-medium tracking-wide uppercase">
              Dato ficticio de la demo
            </p>
          )}
          <Semaforo color={resultado.color} titulo={resultado.titulo} detalle={resultado.explicacion} />
          <p className="text-center text-sm text-muted-foreground">
            Número consultado: <span className="font-semibold text-foreground">{resultado.telefonoFormateado}</span>
            {" · "}
            Índice de riesgo {resultado.puntaje}
          </p>
          {!resultado.pareceCelular && (
            <p className="text-sm leading-relaxed text-muted-foreground">
              Este número no parece celular. SINPE Móvil suele usar un número que empieza con 5, 6, 7 u 8.
            </p>
          )}
          <Recordatorio texto={resultado.recordatorio} titulo="Verificá el nombre en tu banco" />
          {resultado.conteo.total > 0 && (
            <div>
              <h3 className="text-sm font-semibold">Qué hay en la lista</h3>
              <ul className="mt-2 space-y-1 text-sm">
                {TIPOS_REPORTE.filter((tipo) => resultado.conteo.porTipo[tipo] > 0).map((tipo) => (
                  <li key={tipo} className="flex justify-between gap-3">
                    <span>{ETIQUETA_TIPO[tipo]}</span>
                    <span className="font-semibold tabular-nums">{resultado.conteo.porTipo[tipo]}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-sm text-muted-foreground">
                {resultado.conteo.ultimos30 === 1
                  ? "1 reporte en los últimos 30 días."
                  : `${resultado.conteo.ultimos30} reportes en los últimos 30 días.`}
              </p>
            </div>
          )}
          {resultado.razones.length > 0 && (
            <ul className="space-y-2 text-sm leading-relaxed">
              {resultado.razones.map((razon) => (
                <li key={razon} className="rounded-xl bg-muted px-3 py-2">
                  {razon}
                </li>
              ))}
            </ul>
          )}
          <Button
            render={<Link href={`/reportar?numero=${resultado.telefono}`} />}
            nativeButton={false}
            variant="outline"
            className="h-12 w-full bg-card text-base"
          >
            Reportar este número
          </Button>
        </section>
      )}
    </div>
  );
}
