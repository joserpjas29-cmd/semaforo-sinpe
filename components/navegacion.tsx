"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleHelp, Clock3, Flag, Home, MessageSquare, Phone, Receipt } from "lucide-react";
import { SelectorTema } from "@/components/tema";
import { Marca } from "@/components/marca";
import { clsFoco } from "@/components/estilos";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", etiqueta: "Inicio", icono: Home },
  { href: "/historial", etiqueta: "Historial", icono: Clock3 },
  { href: "/ayuda", etiqueta: "Ayuda", icono: CircleHelp },
] as const;

const ENLACES = [
  { href: "/", etiqueta: "Inicio", icono: Home },
  { href: "/consultar", etiqueta: "Consultar", icono: Phone },
  { href: "/comprobante", etiqueta: "Comprobante", icono: Receipt },
  { href: "/sms", etiqueta: "SMS", icono: MessageSquare },
  { href: "/reportar", etiqueta: "Reportar", icono: Flag },
  { href: "/historial", etiqueta: "Historial", icono: Clock3 },
  { href: "/ayuda", etiqueta: "Ayuda", icono: CircleHelp },
] as const;

function esInicio(ruta: string): boolean {
  return (
    ruta === "/" ||
    ruta.startsWith("/consultar") ||
    ruta.startsWith("/comprobante") ||
    ruta.startsWith("/sms") ||
    ruta.startsWith("/reportar")
  );
}

function activoEnlace(ruta: string, href: string): boolean {
  if (href === "/") return ruta === "/";
  return ruta === href || ruta.startsWith(`${href}/`);
}

export function BarraLateral() {
  const ruta = usePathname();

  return (
    <aside className="hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-card lg:flex">
      <div className="px-5 pt-6">
        <Link href="/" className={cn("inline-flex rounded-lg", clsFoco)}>
          <Marca />
        </Link>
        <p className="mt-2 text-sm leading-snug text-muted-foreground">Detectá estafas antes de transferir.</p>
      </div>
      <nav aria-label="Principal" className="mt-6 flex flex-1 flex-col gap-1 px-3">
        {ENLACES.map((enlace) => {
          const activo = activoEnlace(ruta, enlace.href);
          const Icono = enlace.icono;
          return (
            <Link
              key={enlace.href}
              href={enlace.href}
              aria-current={activo ? "page" : undefined}
              className={cn(
                "flex h-11 items-center gap-3 rounded-2xl px-3 text-sm font-semibold",
                clsFoco,
                activo ? "bg-inverse text-inverse-foreground" : "text-muted-foreground hover:bg-canvas hover:text-foreground",
              )}
            >
              <Icono className="size-5" aria-hidden />
              {enlace.etiqueta}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border p-4">
        <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Apariencia</p>
        <SelectorTema />
      </div>
    </aside>
  );
}

export function Navegacion() {
  const ruta = usePathname();

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 px-4 pb-4 lg:hidden">
      <nav
        aria-label="Principal"
        className="pointer-events-auto flex items-center justify-around rounded-full border border-border bg-card px-2 py-2 shadow-[0_10px_30px_rgb(15_23_42_/_0.12)]"
      >
        {TABS.map((tab) => {
          const activo = tab.href === "/" ? esInicio(ruta) : ruta.startsWith(tab.href);
          const Icono = tab.icono;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={activo ? "page" : undefined}
              className={cn(
                "flex h-11 items-center justify-center gap-2 rounded-full text-sm font-semibold",
                clsFoco,
                activo ? "bg-inverse px-5 text-inverse-foreground" : "px-3 text-muted-foreground",
              )}
            >
              <Icono className="size-5" aria-hidden />
              {activo ? <span>{tab.etiqueta}</span> : <span className="sr-only">{tab.etiqueta}</span>}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
