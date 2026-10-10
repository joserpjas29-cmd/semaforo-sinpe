"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Clipboard } from "lucide-react";
import { Encabezado } from "@/components/encabezado";
import { clsBoton, clsEnlace, clsFoco } from "@/components/estilos";
import { Recordatorio } from "@/components/recordatorio";
import { ResultadoRiesgo, type LineaResultado } from "@/components/resultado-riesgo";
import { guardarHistorial } from "@/lib/historial-local";
import { analizarSms, AVISO_SMS, EJEMPLOS_SMS, PRIVACIDAD_SMS, type ResultadoSms } from "@/lib/sms";
import { cn } from "@/lib/utils";

const LLAMADO = {
  rojo: "No abras enlaces, no des claves y no des por hecho el pago.",
  amarillo: "No te guíes solo por este texto. Mirá el movimiento en tu banco.",
  verde: "Verde no prueba que el mensaje sea real. Confirmá en tu banco.",
} as const;

const PUNTO = {
  rojo: "bg-[#DC2626]",
  amarillo: "bg-[#F59E0B]",
  verde: "bg-[#16A34A]",
} as const;

export function SmsForm() {
  const [texto, setTexto] = useState("");
  const [nota, setNota] = useState("");
  const [notaAbierta, setNotaAbierta] = useState(false);
  const [ejemplos, setEjemplos] = useState(false);
  const [error, setError] = useState("");
  const [resultado, setResultado] = useState<ResultadoSms | null>(null);

  function publicar(siguiente: ResultadoSms) {
    setResultado(siguiente);
    guardarHistorial({
      tipo: "sms",
      color: siguiente.color,
      titulo: siguiente.titulo,
    });
  }

  function analizar(evento: FormEvent) {
    evento.preventDefault();
    if (!texto.trim()) return;
    setError("");
    publicar(analizarSms(texto, nota));
  }

  async function pegar() {
    setError("");
    try {
      const leido = await navigator.clipboard.readText();
      if (!leido.trim()) {
        setError("El portapapeles está vacío.");
        return;
      }
      setTexto(leido);
      setResultado(null);
    } catch {
      setError("No se pudo leer el portapapeles. Pegá el mensaje con el teclado.");
    }
  }

  function usarEjemplo(ejemplo: (typeof EJEMPLOS_SMS)[number]) {
    setTexto(ejemplo.texto);
    setNota(ejemplo.nota ?? "");
    if (ejemplo.nota) setNotaAbierta(true);
    setError("");
    publicar(analizarSms(ejemplo.texto, ejemplo.nota ?? ""));
  }

  const lineas: LineaResultado[] =
    resultado?.razones.map((razon, indice) => ({ id: `razon-${indice}`, titulo: razon })) ?? [];

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Encabezado titulo="Pegar SMS" texto="Pegá el mensaje que querés verificar." />
      <p className="mt-3 text-sm leading-relaxed text-[#64748B]">{PRIVACIDAD_SMS}</p>

      <form className="mt-5 flex flex-1 flex-col" onSubmit={analizar}>
        <label htmlFor="sms" className="sr-only">
          SMS del comprobante
        </label>
        <textarea
          id="sms"
          name="sms"
          value={texto}
          onChange={(evento) => {
            setTexto(evento.target.value);
            setResultado(null);
          }}
          placeholder="Ej.: SINPE Móvil: Ha recibido ₡45.000 de MARIA ROJAS M. al 8888-6060. Ref: 2026100915342. Comprobante: bit.ly/xxxx"
          className="min-h-[180px] w-full resize-none rounded-[20px] border border-[#E2E8F0] bg-white px-4 py-4 text-[15px] leading-relaxed text-[#0F172A] outline-none placeholder:text-[#94A3B8] focus-visible:border-[#1D4ED8]"
          autoComplete="off"
        />

        <button
          type="button"
          onClick={() => void pegar()}
          className={cn(
            "mt-3 inline-flex w-fit items-center gap-2 rounded-full border border-[#E2E8F0] bg-white px-4 py-2 text-sm font-medium text-[#0F172A]",
            clsFoco,
          )}
        >
          <Clipboard className="size-4 text-[#64748B]" aria-hidden />
          Pegar del portapapeles
        </button>

        <button
          type="button"
          onClick={() => setNotaAbierta((valor) => !valor)}
          className={cn(clsEnlace, "mt-3 w-fit")}
        >
          {notaAbierta ? "Ocultar nota" : "Agregar una nota (opcional)"}
        </button>
        {notaAbierta && (
          <textarea
            id="nota"
            name="nota"
            value={nota}
            onChange={(evento) => {
              setNota(evento.target.value);
              setResultado(null);
            }}
            placeholder="Por ejemplo: me pidió que le devolviera la plata."
            aria-label="Nota, si querés contar el contexto"
            className="mt-2 min-h-20 w-full resize-none rounded-[16px] border border-[#E2E8F0] bg-white px-4 py-3 text-[15px] leading-relaxed outline-none placeholder:text-[#94A3B8] focus-visible:border-[#1D4ED8]"
            autoComplete="off"
          />
        )}

        {error && (
          <p role="alert" className="mt-3 text-sm font-medium text-[#DC2626]">
            {error}
          </p>
        )}

        <div className="mt-auto space-y-3 pt-8">
          <Recordatorio texto={AVISO_SMS} titulo="Esto no verifica el mensaje" />
          <button type="submit" disabled={!texto.trim()} className={clsBoton}>
            Analizar mensaje
          </button>
          <button type="button" onClick={() => setEjemplos((valor) => !valor)} className={cn(clsEnlace, "w-full")}>
            {ejemplos ? "Ocultar ejemplos" : "Usar mensaje de ejemplo"}
          </button>
          {ejemplos && (
            <>
              <ul className="flex flex-wrap gap-2">
                {EJEMPLOS_SMS.map((ejemplo) => (
                  <li key={ejemplo.id}>
                    <button
                      type="button"
                      onClick={() => usarEjemplo(ejemplo)}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full border border-[#E2E8F0] bg-white px-3 py-1.5 text-sm font-medium text-[#0F172A]",
                        clsFoco,
                      )}
                    >
                      <span className={cn("size-2 rounded-full", PUNTO[ejemplo.veredicto === "se_ve_normal" ? "verde" : ejemplo.veredicto === "poco_claro" ? "amarillo" : "rojo"])} aria-hidden />
                      {ejemplo.etiqueta}
                    </button>
                  </li>
                ))}
              </ul>
              <p className="text-xs leading-relaxed text-[#94A3B8]">
                Textos ficticios de Banco Nacional, BCR y BAC. No son mensajes reales ni se conectan a un banco.
              </p>
            </>
          )}
        </div>
      </form>

      {resultado && (
        <ResultadoRiesgo
          color={resultado.color}
          titulo={resultado.titulo}
          explicacion={resultado.explicacion}
          lineas={lineas}
          banner={LLAMADO[resultado.color]}
          nota={resultado.aviso}
          onCerrar={() => setResultado(null)}
          acciones={
            <>
              <button type="button" onClick={() => setResultado(null)} className={clsBoton}>
                Revisar otro
              </button>
              <Link href="/comprobante" className={clsEnlace}>
                Si te mandaron una captura, pasá a Comprobante
              </Link>
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
