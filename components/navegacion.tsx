"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleHelp, Clock3, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { clsFoco } from "@/components/estilos";

const TABS = [
  { href: "/", etiqueta: "Inicio", icono: Home },
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

export function Navegacion() {
  const ruta = usePathname();

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 px-4 pb-4">
      <nav
        aria-label="Principal"
        className="pointer-events-auto flex items-center justify-around rounded-full border border-[#E2E8F0] bg-white px-2 py-2 shadow-[0_10px_30px_rgb(15_23_42_/_0.08)]"
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
                activo ? "bg-[#0F172A] px-5 text-white" : "px-3 text-[#64748B]",
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
