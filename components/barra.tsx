"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ENLACES = [
  { href: "/consultar", etiqueta: "Consultar" },
  { href: "/comprobante", etiqueta: "Comprobante" },
  { href: "/reportar", etiqueta: "Reportar" },
];

function Marca() {
  return (
    <Link href="/" className="flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring">
      <svg viewBox="0 0 32 48" className="h-8 w-5" aria-hidden>
        <rect width="32" height="48" rx="10" fill="#241f1b" />
        <circle cx="16" cy="10" r="4" fill="#ef4d42" />
        <circle cx="16" cy="24" r="4" fill="#f0b429" />
        <circle cx="16" cy="38" r="4" fill="#22a35a" />
      </svg>
      <span className="font-heading text-lg leading-none tracking-tight">
        Semáforo <span className="text-primary">SINPE</span>
      </span>
    </Link>
  );
}

export function Barra() {
  const ruta = usePathname();

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-border/80 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-4 px-4">
          <Marca />
          <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
            {ENLACES.map((enlace) => {
              const activo = ruta === enlace.href;
              return (
                <Link
                  key={enlace.href}
                  href={enlace.href}
                  aria-current={activo ? "page" : undefined}
                  className={cn(
                    "rounded-full px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring",
                    activo ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted",
                  )}
                >
                  {enlace.etiqueta}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <nav
        aria-label="Principal móvil"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 backdrop-blur md:hidden"
      >
        <ul className="grid grid-cols-3">
          {ENLACES.map((enlace) => {
            const activo = ruta === enlace.href;
            return (
              <li key={enlace.href}>
                <Link
                  href={enlace.href}
                  aria-current={activo ? "page" : undefined}
                  className={cn(
                    "flex h-16 items-center justify-center text-sm font-medium",
                    activo ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {enlace.etiqueta}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}

export function Pie() {
  return (
    <footer className="mt-16 border-t border-border/80">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 py-8 text-sm leading-relaxed text-muted-foreground">
        <p>
          Semáforo SINPE no está afiliado a ningún banco ni al Banco Central de Costa Rica. No usa
          marcas ni logos oficiales. No mueve plata y no entra a tu banca.
        </p>
        <p>
          Los números y comprobantes de ejemplo son ficticios, armados para la demo. Un semáforo
          verde no es permiso para enviar o dar por recibido un pago.
        </p>
      </div>
    </footer>
  );
}
