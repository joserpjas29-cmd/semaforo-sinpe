import Link from "next/link";
import { PanelEstadisticas } from "@/components/estadisticas";
import { Semaforo } from "@/components/semaforo";
import { obtenerEstadisticas } from "@/lib/db";
import { NUMEROS_DEMO } from "@/lib/ejemplos";
import { formatearTelefono } from "@/lib/telefono";
import type { ColorSemaforo } from "@/lib/tipos";

export const dynamic = "force-dynamic";

const NOMBRE_COLOR: Record<ColorSemaforo, string> = {
  verde: "Verde",
  amarillo: "Amarillo",
  rojo: "Rojo",
};

const PASOS = [
  {
    numero: "01",
    titulo: "Consultá el número",
    texto: "Meté el celular de 8 dígitos antes de enviar. El color sale de lo que otras personas reportaron, con más peso si fue reciente y grave.",
  },
  {
    numero: "02",
    titulo: "Analizá el comprobante",
    texto: "Si te mandan la captura, la leemos en el servidor. Buscamos fecha imposible, referencia rara, montos que no cuadran y el guion de «devolveme la plata».",
  },
  {
    numero: "03",
    titulo: "Reportá si te pasó",
    texto: "Tu aviso entra en la lista que usa la consulta. No pedimos tu nombre. En público se ven cantidades y tipos, no el texto libre.",
  },
];

export default async function Inicio() {
  const estadisticas = await obtenerEstadisticas();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-16 px-4 py-10 md:py-16">
      <section className="grid items-center gap-10 md:grid-cols-[minmax(0,1.15fr)_minmax(16rem,0.85fr)]">
        <div>
          <p className="text-sm font-semibold tracking-[0.14em] text-primary uppercase">Costa Rica · SINPE Móvil</p>
          <h1 className="mt-3 font-heading text-4xl leading-[1.05] text-balance md:text-6xl">
            Antes de soltar la plata, mirá el semáforo.
          </h1>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted-foreground">
            SINPE Móvil es rapidísimo. También lo es la estafa: números reciclados, comprobantes
            editados y el clásico «me equivoqué, devuélvame». Esta herramienta junta reportes de la
            gente y lee la captura antes de que te confiés.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/consultar"
              className="inline-flex h-12 items-center justify-center rounded-lg bg-primary px-5 text-base font-medium text-primary-foreground"
            >
              Consultar un número
            </Link>
            <Link
              href="/comprobante"
              className="inline-flex h-12 items-center justify-center rounded-lg bg-card px-5 text-base font-medium ring-1 ring-foreground/15"
            >
              Analizar un comprobante
            </Link>
          </div>
        </div>
        <div className="flex justify-center">
          <Semaforo decorativo />
        </div>
      </section>

      <section aria-labelledby="titulo-problema" className="grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl bg-card p-6 ring-1 ring-foreground/10">
          <h2 id="titulo-problema" className="font-heading text-2xl">
            El problema
          </h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            Cuando te escriben para venderte algo, o cuando un cliente te manda la captura del pago,
            no tenés una forma fácil de saber si ese número ya quemó a alguien. El banco te muestra un
            nombre al enviar. Al recibir, un pantallazo no es un depósito.
          </p>
        </div>
        <div className="rounded-3xl bg-[#143f3a] p-6 text-[#f6f3ea]">
          <h2 className="font-heading text-2xl">Qué no hace</h2>
          <p className="mt-3 leading-relaxed text-[#f6f3ea]/85">
            No confirma movimientos, no se conecta a tu banca y no está afiliada a ningún banco ni al
            BCCR. El verde significa «no hay alertas en esta lista», no «mandá la plata tranquilo».
          </p>
        </div>
      </section>

      <section aria-labelledby="titulo-pasos">
        <h2 id="titulo-pasos" className="font-heading text-2xl">
          Cómo funciona
        </h2>
        <ol className="mt-4 grid gap-4 md:grid-cols-3">
          {PASOS.map((paso) => (
            <li key={paso.numero} className="rounded-3xl bg-card p-5 ring-1 ring-foreground/10">
              <p className="font-heading text-sm text-primary">{paso.numero}</p>
              <h3 className="mt-2 font-heading text-xl">{paso.titulo}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{paso.texto}</p>
            </li>
          ))}
        </ol>
      </section>

      <PanelEstadisticas datos={estadisticas} />

      <section aria-labelledby="titulo-demo">
        <h2 id="titulo-demo" className="font-heading text-2xl">
          Números ficticios para la demo
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Estos celulares no son de nadie. Están sembrados para que el jurado vea verde, amarillo y
          rojo sin esperar reportes reales.
        </p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {NUMEROS_DEMO.map((numero) => (
            <li key={numero.telefono}>
              <Link
                href={`/consultar?numero=${numero.telefono}`}
                className="flex items-center justify-between gap-3 rounded-2xl bg-card px-4 py-3 ring-1 ring-foreground/10 transition hover:ring-primary/40"
              >
                <span>
                  <span className="block font-semibold tabular-nums">{formatearTelefono(numero.telefono)}</span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">{numero.nota}</span>
                </span>
                <span className="shrink-0 text-sm font-semibold">{NOMBRE_COLOR[numero.color]}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
