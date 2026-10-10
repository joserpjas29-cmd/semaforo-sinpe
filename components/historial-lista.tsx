"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { ChevronRight } from "lucide-react";
import { TituloPantalla } from "@/components/encabezado";
import { clsFoco } from "@/components/estilos";
import {
  etiquetaCuando,
  historialServidor,
  leerHistorial,
  suscribirHistorial,
  type EntradaHistorial,
  type TipoConsulta,
} from "@/lib/historial-local";
import { formatearTelefono } from "@/lib/telefono";
import type { ColorSemaforo } from "@/lib/tipos";
import { cn } from "@/lib/utils";

const FILTROS: { id: "todos" | ColorSemaforo; etiqueta: string }[] = [
  { id: "todos", etiqueta: "Todos" },
  { id: "rojo", etiqueta: "Rojo" },
  { id: "amarillo", etiqueta: "Amarillo" },
  { id: "verde", etiqueta: "Verde" },
];

const PUNTO: Record<ColorSemaforo, string> = {
  rojo: "bg-riesgo-rojo",
  amarillo: "bg-riesgo-amarillo",
  verde: "bg-riesgo-verde",
};

const NOMBRE_COLOR: Record<ColorSemaforo, string> = {
  rojo: "Rojo",
  amarillo: "Amarillo",
  verde: "Verde",
};

const NOMBRE_TIPO: Record<TipoConsulta, string> = {
  numero: "Número",
  comprobante: "Comprobante",
  sms: "SMS",
};

function hrefDe(entrada: EntradaHistorial): string {
  if (entrada.tipo === "numero" && entrada.telefono) return `/consultar?numero=${entrada.telefono}`;
  if (entrada.tipo === "comprobante") return "/comprobante";
  return "/sms";
}

export function HistorialLista() {
  const entradas = useSyncExternalStore(suscribirHistorial, leerHistorial, historialServidor);
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]["id"]>("todos");

  const visibles = filtro === "todos" ? entradas : entradas.filter((entrada) => entrada.color === filtro);

  return (
    <div className="mx-auto w-full max-w-3xl lg:max-w-4xl">
      <TituloPantalla titulo="Historial" texto="Tus últimas consultas" />
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Se guarda solo en este navegador. No mandamos el SMS, la foto ni una lista nueva al servidor.
      </p>

      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Filtrar por color">
        {FILTROS.map((opcion) => {
          const activo = filtro === opcion.id;
          return (
            <button
              key={opcion.id}
              type="button"
              aria-pressed={activo}
              onClick={() => setFiltro(opcion.id)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-sm font-semibold",
                clsFoco,
                activo ? "bg-primary text-white" : "border border-border bg-card text-foreground",
              )}
            >
              {opcion.etiqueta}
            </button>
          );
        })}
      </div>

      {visibles.length === 0 ? (
        <div className="mt-8 rounded-[20px] border border-border bg-card px-4 py-6 text-center">
          <p className="text-[15px] font-semibold text-foreground">
            {entradas.length === 0 ? "Todavía no hay consultas acá" : "Nada de este color"}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {entradas.length === 0
              ? "Cuando consultés un número, un comprobante o un SMS, el color queda en esta lista."
              : "Probá con otro filtro o hacé una consulta nueva."}
          </p>
          <Link href="/consultar" className="mt-4 inline-flex text-sm font-semibold text-link">
            Consultar un número
          </Link>
        </div>
      ) : (
        <ul className="mt-4 overflow-hidden rounded-[20px] border border-border bg-card">
          {visibles.map((entrada) => (
            <li key={entrada.id} className="border-b border-border last:border-b-0">
              <Link href={hrefDe(entrada)} className={cn("flex items-center gap-3 px-4 py-3.5", clsFoco)}>
                <span className={cn("size-2.5 shrink-0 rounded-full", PUNTO[entrada.color])} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold text-foreground">
                    {entrada.tipo === "numero" && entrada.telefono
                      ? `+506 ${formatearTelefono(entrada.telefono)}`
                      : entrada.titulo}
                  </span>
                  <span className="mt-0.5 block text-[13px] text-muted-foreground">
                    {etiquetaCuando(entrada.fecha)} · {NOMBRE_TIPO[entrada.tipo]}
                    {entrada.puntaje != null ? ` · índice ${entrada.puntaje}` : ""}
                  </span>
                </span>
                <span className="text-sm font-semibold text-muted-foreground">{NOMBRE_COLOR[entrada.color]}</span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
