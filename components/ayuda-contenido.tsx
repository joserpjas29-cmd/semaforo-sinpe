"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { TituloPantalla } from "@/components/encabezado";
import { PanelEstadisticas } from "@/components/estadisticas";
import { clsFoco } from "@/components/estilos";
import type { Estadisticas } from "@/lib/db";
import { cn } from "@/lib/utils";

const PREGUNTAS = [
  {
    id: "semaforo",
    pregunta: "¿Cómo funciona el semáforo?",
    respuesta:
      "Revisamos si el número tiene reportes en Stopfy. El color sale de un índice, no de un porcentaje: verde de 0 a 17, amarillo de 18 a 54 y rojo de 55 o más. Un reporte grave de los últimos 14 días deja el semáforo al menos en amarillo, y dos graves en 30 días (comprobante falso o número reciclado) lo ponen en rojo. Verde no es permiso para transferir.",
  },
  {
    id: "reportes",
    pregunta: "¿De dónde salen los reportes?",
    respuesta:
      "De las personas que usan Reportar. Hay números ficticios de la demo, marcados como ejemplo. No es una lista oficial de un banco ni del Banco Central.",
  },
  {
    id: "datos",
    pregunta: "¿Stopfy guarda mis datos?",
    respuesta:
      "No te pedimos tu número ni tu nombre. El celular que consultás o reportás no se guarda en claro: en el servidor queda un código HMAC. El SMS se revisa en tu navegador y no se envía. El historial de consultas vive solo en este navegador y no incluye el texto del mensaje ni la foto. Si el sello de Stellar está prendido, a la red de pruebas se manda solo un hash del reporte.",
  },
  {
    id: "comprobante",
    pregunta: "¿Cómo verifico un comprobante?",
    respuesta:
      "Subí la captura. Buscamos fecha imposible, referencia rara, montos que no cuadran y el guion de «devolveme la plata». Confirmá el depósito en tu banco: un pantallazo no es plata en la cuenta. Si el lector no saca nada, el resultado no sale verde.",
  },
  {
    id: "reportar",
    pregunta: "¿Cómo reporto un número?",
    respuesta:
      "En Reportar elegí el tipo: comprobante falso, número reciclado, pidió devolución u otro. Contá en una frase qué pasó, sin cédulas ni cuentas. En la consulta se ven cantidades y tipos, no el texto libre.",
  },
  {
    id: "stellar",
    pregunta: "¿Qué es el sello de Stellar?",
    respuesta:
      "Si está configurado, cada reporte nuevo deja un hash en la red de pruebas de Stellar (testnet), no en la red principal. El hash no incluye el número ni el texto. Sirve para comprobar en el explorador que el reporte existía en ese momento. No prueba que la estafa haya ocurrido. Si no hay cuenta configurada, el reporte se guarda igual y no aparece el sello.",
  },
] as const;

export function AyudaContenido({ datos }: { datos: Estadisticas }) {
  const [abierta, setAbierta] = useState<string>(PREGUNTAS[0].id);

  return (
    <div className="mx-auto w-full max-w-3xl lg:max-w-4xl">
      <TituloPantalla titulo="Ayuda" texto="Preguntas frecuentes" />

      <div className="mt-5 overflow-hidden rounded-[20px] border border-border bg-card">
        {PREGUNTAS.map((item) => {
          const abiertaEsta = abierta === item.id;
          return (
            <div key={item.id} className="border-b border-border last:border-b-0">
              <button
                type="button"
                aria-expanded={abiertaEsta}
                aria-controls={`respuesta-${item.id}`}
                onClick={() => setAbierta(abiertaEsta ? "" : item.id)}
                className={cn("flex w-full items-center justify-between gap-3 px-4 py-4 text-left", clsFoco)}
              >
                <span className="text-[15px] font-semibold text-foreground">{item.pregunta}</span>
                <ChevronDown
                  className={cn("size-4 shrink-0 text-muted-foreground transition-transform", abiertaEsta && "rotate-180")}
                  aria-hidden
                />
              </button>
              {abiertaEsta && (
                <p id={`respuesta-${item.id}`} className="px-4 pb-4 text-sm leading-relaxed text-muted-foreground">
                  {item.respuesta}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8">
        <PanelEstadisticas datos={datos} />
      </div>

      <section className="mt-8 text-center">
        <h2 className="text-lg font-extrabold tracking-tight text-foreground">¿Necesitás más ayuda?</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Stopfy no tiene un canal de soporte aparte: es un proyecto de hackathon y no publicamos un correo inventado.
          Si algo no cuadra, el semáforo no reemplaza a tu banco.
        </p>
      </section>
    </div>
  );
}
