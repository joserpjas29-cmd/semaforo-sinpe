"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Recordatorio } from "@/components/recordatorio";
import { Semaforo } from "@/components/semaforo";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { analizarSms, AVISO_SMS, EJEMPLOS_SMS, PRIVACIDAD_SMS, type ResultadoSms } from "@/lib/sms";

export function SmsForm() {
  const [texto, setTexto] = useState("");
  const [nota, setNota] = useState("");
  const [resultado, setResultado] = useState<ResultadoSms | null>(null);

  function analizar(evento: FormEvent) {
    evento.preventDefault();
    setResultado(analizarSms(texto, nota));
  }

  function usarEjemplo(ejemplo: (typeof EJEMPLOS_SMS)[number]) {
    setTexto(ejemplo.texto);
    setNota(ejemplo.nota ?? "");
    setResultado(analizarSms(ejemplo.texto, ejemplo.nota ?? ""));
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-8">
      <header className="space-y-2">
        <p className="text-sm font-semibold tracking-[0.14em] text-primary uppercase">Mensaje de texto</p>
        <h1 className="font-heading text-4xl text-balance">Revisá el SMS</h1>
        <p className="leading-relaxed text-muted-foreground">
          Pegá el mensaje que te llegó, del estilo de Banco Nacional o SINPE Móvil. Buscamos señales
          raras en el texto. No es una verificación del banco.
        </p>
        <p className="text-sm leading-relaxed">
          <Link href="/comprobante" className="font-medium text-primary underline-offset-4 hover:underline">
            Si te mandaron una captura, analizalá en Comprobante
          </Link>
        </p>
      </header>

      <Recordatorio texto={AVISO_SMS} titulo="Esto no verifica el mensaje" />
      <p className="text-sm leading-relaxed text-muted-foreground">{PRIVACIDAD_SMS}</p>

      <form className="space-y-5" onSubmit={analizar}>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Mensajes ficticios</legend>
          <ul className="flex flex-wrap gap-2">
            {EJEMPLOS_SMS.map((ejemplo) => (
              <li key={ejemplo.id}>
                <Button type="button" variant="outline" className="h-10 bg-card" onClick={() => usarEjemplo(ejemplo)}>
                  {ejemplo.etiqueta}
                </Button>
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">Textos armados para la demo. No son mensajes reales.</p>
        </fieldset>

        <div className="space-y-2">
          <Label htmlFor="sms">SMS del comprobante</Label>
          <Textarea
            id="sms"
            name="sms"
            value={texto}
            onChange={(evento) => {
              setTexto(evento.target.value);
              setResultado(null);
            }}
            placeholder="Pegá acá el mensaje de texto, tal como te llegó."
            className="min-h-40 text-base md:text-base"
            autoComplete="off"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="nota">Nota, si querés contar el contexto</Label>
          <Textarea
            id="nota"
            name="nota"
            value={nota}
            onChange={(evento) => {
              setNota(evento.target.value);
              setResultado(null);
            }}
            placeholder="Por ejemplo: me pidió que le devolviera la plata. Es opcional."
            className="min-h-20 text-base md:text-base"
            autoComplete="off"
          />
        </div>

        <Button type="submit" className="h-12 w-full text-base">
          Revisar el mensaje
        </Button>
      </form>

      {resultado && (
        <section className="space-y-5 rounded-3xl bg-card p-5 ring-1 ring-foreground/10" aria-label="Resultado del SMS">
          <Semaforo color={resultado.color} titulo={resultado.titulo} detalle={resultado.explicacion} />
          <div>
            <h3 className="text-sm font-semibold">Por qué</h3>
            <ul className="mt-2 space-y-2">
              {resultado.razones.map((razon) => (
                <li key={razon} className="rounded-xl bg-muted px-3 py-2 text-sm leading-relaxed">
                  {razon}
                </li>
              ))}
            </ul>
          </div>
          <Recordatorio texto={resultado.aviso} titulo="Esto no verifica el mensaje" />
        </section>
      )}
    </div>
  );
}
