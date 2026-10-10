"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Flag, Menu, MessageSquare, Phone, Receipt, ShieldCheck, X } from "lucide-react";
import { Bienvenida } from "@/components/bienvenida";
import { clsBoton, clsFoco } from "@/components/estilos";
import { Marca, Puntos } from "@/components/marca";
import { cn } from "@/lib/utils";

const CLAVE_BIENVENIDA = "stopfy-bienvenida";
const oyentesBienvenida = new Set<() => void>();

function suscribirBienvenida(alCambiar: () => void) {
  oyentesBienvenida.add(alCambiar);
  return () => {
    oyentesBienvenida.delete(alCambiar);
  };
}

function debeMostrarBienvenida(): boolean {
  try {
    return window.localStorage.getItem(CLAVE_BIENVENIDA) !== "1";
  } catch {
    return false;
  }
}

function noMostrarBienvenida() {
  return false;
}

function ocultarBienvenida() {
  try {
    window.localStorage.setItem(CLAVE_BIENVENIDA, "1");
  } catch {
    // Si el navegador no guarda la marca, la bienvenida puede volver a salir.
  }
  for (const oyente of oyentesBienvenida) oyente();
}

const OPCIONES = [
  {
    href: "/consultar",
    titulo: "Consultar",
    texto: "Verificá un número",
    icono: Phone,
  },
  {
    href: "/comprobante",
    titulo: "Comprobante",
    texto: "Foto del comprobante",
    icono: Receipt,
  },
  {
    href: "/sms",
    titulo: "SMS",
    texto: "Adjuntá un mensaje",
    icono: MessageSquare,
  },
  {
    href: "/reportar",
    titulo: "Reportar",
    texto: "Informá una estafa",
    icono: Flag,
  },
] as const;

export function Inicio() {
  const bienvenida = useSyncExternalStore(suscribirBienvenida, debeMostrarBienvenida, noMostrarBienvenida);
  const [menu, setMenu] = useState(false);

  return (
    <>
      {bienvenida && <Bienvenida onContinuar={ocultarBienvenida} />}
      <div className={bienvenida ? "contents" : undefined} inert={bienvenida ? true : undefined}>
      <header className="flex items-center justify-between">
        <Marca />
        <div className="flex items-center gap-3">
          <Puntos />
          <button
            type="button"
            aria-expanded={menu}
            aria-controls="panel-acerca"
            onClick={() => setMenu(true)}
            className={cn(
              "flex size-10 items-center justify-center rounded-full border border-[#E2E8F0] bg-white text-[#0F172A]",
              clsFoco,
            )}
          >
            <Menu className="size-5" />
            <span className="sr-only">Acerca de Stopfy</span>
          </button>
        </div>
      </header>

      <section className="mt-10 text-center">
        <ShieldCheck className="mx-auto size-12 text-[#0D9488]" strokeWidth={1.6} aria-hidden />
        <h1 className="mt-4 text-[28px] font-extrabold tracking-[-0.03em] text-[#0F172A]">Protege tu SINPE.</h1>
        <p className="mt-1 text-[15px] text-[#64748B]">Elegí una opción para comenzar</p>
      </section>

      <ul className="mt-6 grid grid-cols-2 gap-3">
        {OPCIONES.map((opcion) => {
          const Icono = opcion.icono;
          return (
            <li key={opcion.href}>
              <Link
                href={opcion.href}
                className={cn(
                  "flex min-h-[156px] flex-col rounded-[22px] border border-[#E2E8F0] bg-white p-4 shadow-[0_8px_24px_rgb(15_23_42_/_0.04)]",
                  clsFoco,
                )}
              >
                <span className="flex size-11 items-center justify-center rounded-2xl bg-[#CCFBF1] text-[#0D9488]">
                  <Icono className="size-5" aria-hidden />
                </span>
                <span className="mt-auto pt-6 text-[16px] font-bold tracking-tight text-[#0F172A]">{opcion.titulo}</span>
                <span className="mt-0.5 text-[13px] text-[#64748B]">{opcion.texto}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      <p className="mt-6 text-center text-[12px] leading-relaxed text-[#94A3B8]">
        Stopfy nació como Semáforo SINPE. No está afiliado a ningún banco ni al BCCR, y no entra a tu cuenta.
      </p>

      {menu && <MenuAcerca onCerrar={() => setMenu(false)} />}
      </div>
    </>
  );
}

function MenuAcerca({ onCerrar }: { onCerrar: () => void }) {
  useEffect(() => {
    function alTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape") onCerrar();
    }
    window.addEventListener("keydown", alTeclar);
    return () => window.removeEventListener("keydown", alTeclar);
  }, [onCerrar]);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-[#0F172A]/40 p-4 md:items-center" onClick={onCerrar}>
      <div
        id="panel-acerca"
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-acerca"
        className="w-full max-w-[398px] rounded-[24px] bg-white p-5 shadow-xl"
        onClick={(evento) => evento.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="titulo-acerca" className="text-lg font-extrabold tracking-tight text-[#0F172A]">
            Acerca de Stopfy
          </h2>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className={cn("flex size-9 items-center justify-center rounded-full text-[#64748B]", clsFoco)}
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="mt-3 space-y-3 text-sm leading-relaxed text-[#64748B]">
          <p>
            Stopfy nació como Semáforo SINPE. Junta reportes de la gente y revisa un comprobante o un SMS antes de
            que sueltes la plata.
          </p>
          <p>No está afiliado a ningún banco ni al Banco Central. No hace transacciones ni entra a tu cuenta.</p>
          <p>No te pedimos tu número. El celular que consultás o reportás se guarda cifrado, no en claro.</p>
        </div>
        <Link href="/ayuda" onClick={onCerrar} className={cn(clsBoton, "mt-5")}>
          Ver ayuda
        </Link>
      </div>
    </div>
  );
}
