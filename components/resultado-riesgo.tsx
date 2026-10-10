"use client";

import { useEffect, useRef } from "react";
import { Check, Minus, ShieldAlert, ShieldCheck, TriangleAlert, X } from "lucide-react";
import type { ColorSemaforo } from "@/lib/tipos";
import { clsFoco } from "@/components/estilos";
import { cn } from "@/lib/utils";

const TEMA: Record<
  ColorSemaforo,
  { texto: string; fondo: string; icono: typeof ShieldAlert; linea: typeof X }
> = {
  rojo: { texto: "#DC2626", fondo: "#FEE2E2", icono: ShieldAlert, linea: X },
  amarillo: { texto: "#D97706", fondo: "#FEF3C7", icono: TriangleAlert, linea: Minus },
  verde: { texto: "#16A34A", fondo: "#DCFCE7", icono: ShieldCheck, linea: Check },
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
    <div className="fixed inset-0 z-40 overflow-y-auto bg-[#F8FAFC] md:bg-[#E7EDF5]">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-resultado"
        className="mx-auto flex min-h-full w-full max-w-[430px] flex-col bg-[#F8FAFC] px-5 pt-4 pb-10 md:my-6 md:min-h-[calc(100dvh-3rem)] md:rounded-[32px] md:ring-1 md:ring-[#E2E8F0]"
      >
        <button
          type="button"
          data-cerrar
          onClick={onCerrar}
          aria-label="Cerrar resultado"
          className={cn("flex size-10 items-center justify-center rounded-full text-[#0F172A]", clsFoco)}
        >
          <X className="size-5" />
        </button>

        <div className="mt-6 flex flex-col items-center text-center" role="status">
          <span
            className="flex size-[88px] items-center justify-center rounded-full"
            style={{ background: tema.fondo, color: tema.texto }}
          >
            <Icono className="size-10" aria-hidden />
          </span>
          <h2 id="titulo-resultado" className="mt-5 text-[26px] font-extrabold tracking-[-0.03em]" style={{ color: tema.texto }}>
            {titulo}
          </h2>
          <p className="mt-2 max-w-[320px] text-[15px] leading-relaxed text-[#64748B]">{explicacion}</p>
          {telefono && (
            <p className="mt-4 rounded-full bg-[#F1F5F9] px-3 py-1 text-sm font-semibold text-[#334155]">+506 {telefono}</p>
          )}
          {esEjemplo && (
            <p className="mt-3 rounded-full bg-[#F1F5F9] px-3 py-1 text-[11px] font-semibold tracking-wide text-[#64748B] uppercase">
              Dato ficticio de la demo
            </p>
          )}
          {indice != null && (
            <p className="mt-3 text-sm text-[#64748B]">
              Índice de riesgo: <span className="font-semibold text-[#0F172A] tabular-nums">{indice}</span>
              <span className="mt-0.5 block text-xs">No es un porcentaje. Sale del peso de los reportes.</span>
            </p>
          )}
        </div>

        {avisoExtra && <p className="mt-4 text-center text-sm leading-relaxed text-[#64748B]">{avisoExtra}</p>}

        {lineas.length > 0 && (
          <ul className="mt-6 space-y-3">
            {lineas.map((linea) => (
              <li key={linea.id} className="flex items-start gap-3">
                <span
                  className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full"
                  style={{ background: tema.fondo, color: tema.texto }}
                >
                  <IconoLinea className="size-3.5" aria-hidden />
                </span>
                <span className="min-w-0 text-[15px] leading-snug text-[#0F172A]">
                  {linea.etiqueta && (
                    <span className="mb-0.5 block text-[11px] font-semibold tracking-wide uppercase" style={{ color: tema.texto }}>
                      {linea.etiqueta}
                    </span>
                  )}
                  <span className="block">{linea.titulo}</span>
                  {linea.detalle && <span className="mt-0.5 block text-sm leading-relaxed text-[#64748B]">{linea.detalle}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}

        {extra && <div className="mt-6">{extra}</div>}

        <p
          className="mt-6 rounded-[16px] px-4 py-3 text-center text-[15px] font-medium"
          style={{ background: tema.fondo, color: tema.texto }}
        >
          {banner}
        </p>
        {nota && <p className="mt-3 text-center text-[13px] leading-relaxed text-[#64748B]">{nota}</p>}

        <div className="mt-6 flex flex-col items-center gap-4">{acciones}</div>
      </div>
    </div>
  );
}
