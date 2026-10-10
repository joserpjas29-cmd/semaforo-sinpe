"use client";

import { useEffect, useRef } from "react";
import { Check, Minus, ShieldAlert, ShieldCheck, TriangleAlert, X } from "lucide-react";
import type { ColorSemaforo } from "@/lib/tipos";
import { clsFoco } from "@/components/estilos";
import { cn } from "@/lib/utils";

const TEMA: Record<
  ColorSemaforo,
  { superficie: string; titulo: string; icono: typeof ShieldAlert; linea: typeof X }
> = {
  rojo: {
    superficie: "bg-riesgo-rojo-fondo text-riesgo-rojo-texto",
    titulo: "text-riesgo-rojo-texto",
    icono: ShieldAlert,
    linea: X,
  },
  amarillo: {
    superficie: "bg-riesgo-amarillo-fondo text-riesgo-amarillo-texto",
    titulo: "text-riesgo-amarillo-texto",
    icono: TriangleAlert,
    linea: Minus,
  },
  verde: {
    superficie: "bg-riesgo-verde-fondo text-riesgo-verde-texto",
    titulo: "text-riesgo-verde-texto",
    icono: ShieldCheck,
    linea: Check,
  },
};

export interface LineaResultado {
  id: string;
  titulo: string;
  detalle?: string;
  etiqueta?: string;
}

export function ResultadoRiesgo({
  color,
  titulo,
  explicacion,
  telefono,
  esEjemplo = false,
  indice,
  lineas,
  banner,
  nota,
  avisoExtra,
  extra,
  acciones,
  onCerrar,
}: {
  color: ColorSemaforo;
  titulo: string;
  explicacion: string;
  telefono?: string;
  esEjemplo?: boolean;
  indice?: number;
  lineas: LineaResultado[];
  banner: string;
  nota?: string;
  avisoExtra?: string;
  extra?: React.ReactNode;
  acciones: React.ReactNode;
  onCerrar: () => void;
}) {
  const tema = TEMA[color];
  const Icono = tema.icono;
  const IconoLinea = tema.linea;
  const dialogRef = useRef<HTMLDivElement>(null);
  const cerrarRef = useRef(onCerrar);

  useEffect(() => {
    cerrarRef.current = onCerrar;
  }, [onCerrar]);

  useEffect(() => {
    const cerrar = dialogRef.current?.querySelector<HTMLElement>("[data-cerrar]");
    cerrar?.focus();
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function alTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape") cerrarRef.current();
    }
    window.addEventListener("keydown", alTeclar);
    return () => {
      document.body.style.overflow = anterior;
      window.removeEventListener("keydown", alTeclar);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background lg:bg-black/50 lg:px-8 lg:py-10">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-resultado"
        className="mx-auto flex min-h-full w-full max-w-2xl flex-col bg-background px-5 pt-4 pb-10 lg:min-h-0 lg:rounded-[28px] lg:bg-card lg:px-8 lg:py-8 lg:ring-1 lg:ring-border"
      >
        <button
          type="button"
          data-cerrar
          onClick={onCerrar}
          aria-label="Cerrar resultado"
          className={cn("flex size-10 items-center justify-center rounded-full text-foreground", clsFoco)}
        >
          <X className="size-5" />
        </button>

        <div className="mt-6 flex flex-col items-center text-center" role="status">
          <span className={cn("flex size-[88px] items-center justify-center rounded-full", tema.superficie)}>
            <Icono className="size-10" aria-hidden />
          </span>
          <h2 id="titulo-resultado" className={cn("mt-5 text-[26px] font-extrabold tracking-[-0.03em] lg:text-3xl", tema.titulo)}>
            {titulo}
          </h2>
          <p className="mt-2 max-w-md text-[15px] leading-relaxed text-muted-foreground">{explicacion}</p>
          {telefono && (
            <p className="mt-4 rounded-full border border-border bg-muted px-3 py-1 text-sm font-semibold text-foreground">+506 {telefono}</p>
          )}
          {esEjemplo && (
            <p className="mt-3 rounded-full border border-border bg-muted px-3 py-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              Dato ficticio de la demo
            </p>
          )}
          {indice != null && (
            <p className="mt-3 text-sm text-muted-foreground">
              Índice de riesgo: <span className="font-semibold text-foreground tabular-nums">{indice}</span>
              <span className="mt-0.5 block text-xs">No es un porcentaje. Sale del peso de los reportes.</span>
            </p>
          )}
        </div>

        {avisoExtra && <p className="mt-4 text-center text-sm leading-relaxed text-muted-foreground">{avisoExtra}</p>}

        {lineas.length > 0 && (
          <ul className="mx-auto mt-6 w-full max-w-lg space-y-3">
            {lineas.map((linea) => (
              <li key={linea.id} className="flex items-start gap-3">
                <span className={cn("mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full", tema.superficie)}>
                  <IconoLinea className="size-3.5" aria-hidden />
                </span>
                <span className="min-w-0 text-[15px] leading-snug text-foreground">
                  {linea.etiqueta && (
                    <span className={cn("mb-0.5 block text-[11px] font-semibold tracking-wide uppercase", tema.titulo)}>
                      {linea.etiqueta}
                    </span>
                  )}
                  <span className="block">{linea.titulo}</span>
                  {linea.detalle && <span className="mt-0.5 block text-sm leading-relaxed text-muted-foreground">{linea.detalle}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}

        {extra && <div className="mx-auto mt-6 w-full max-w-lg">{extra}</div>}

        <p className={cn("mx-auto mt-6 w-full max-w-lg rounded-[16px] px-4 py-3 text-center text-[15px] font-medium", tema.superficie)}>
          {banner}
        </p>
        {nota && <p className="mx-auto mt-3 max-w-lg text-center text-[13px] leading-relaxed text-muted-foreground">{nota}</p>}

        <div className="mx-auto mt-6 flex w-full max-w-lg flex-col items-center gap-4">{acciones}</div>
      </div>
    </div>
  );
}
