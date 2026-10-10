"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";
import { clsFoco } from "@/components/estilos";
import { cn } from "@/lib/utils";

const CLAVE = "stopfy-tema";
const EVENTO = "stopfy-tema";

export type Tema = "sistema" | "claro" | "oscuro";

const OPCIONES: { id: Tema; etiqueta: string }[] = [
  { id: "sistema", etiqueta: "Sistema" },
  { id: "claro", etiqueta: "Claro" },
  { id: "oscuro", etiqueta: "Oscuro" },
];

function esTema(valor: string | null): valor is Tema {
  return valor === "sistema" || valor === "claro" || valor === "oscuro";
}

export function leerTema(): Tema {
  if (typeof window === "undefined") return "sistema";
  try {
    const guardado = window.localStorage.getItem(CLAVE);
    return esTema(guardado) ? guardado : "sistema";
  } catch {
    return "sistema";
  }
}

function esOscuro(tema: Tema): boolean {
  return tema === "oscuro" || (tema !== "claro" && window.matchMedia("(prefers-color-scheme: dark)").matches);
}

function aplicarClase(tema: Tema) {
  document.documentElement.classList.toggle("dark", esOscuro(tema));
}

function suscribir(alCambiar: () => void) {
  window.addEventListener(EVENTO, alCambiar);
  window.addEventListener("storage", alCambiar);
  return () => {
    window.removeEventListener(EVENTO, alCambiar);
    window.removeEventListener("storage", alCambiar);
  };
}

export function elegirTema(tema: Tema) {
  try {
    window.localStorage.setItem(CLAVE, tema);
  } catch {
    // Si el navegador bloquea el almacenamiento, el tema igual cambia en esta visita.
  }
  aplicarClase(tema);
  window.dispatchEvent(new Event(EVENTO));
}

export function AplicarTema() {
  useLayoutEffect(() => {
    aplicarClase(leerTema());
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    function alCambiarSistema() {
      if (leerTema() === "sistema") aplicarClase("sistema");
    }
    media.addEventListener("change", alCambiarSistema);
    return () => media.removeEventListener("change", alCambiarSistema);
  }, []);
  return null;
}

export function SelectorTema({ className }: { className?: string }) {
  const tema = useSyncExternalStore(suscribir, leerTema, () => "sistema" as Tema);

  return (
    <div role="radiogroup" aria-label="Apariencia" className={cn("grid grid-cols-3 gap-1 rounded-full bg-canvas p-1", className)}>
      {OPCIONES.map((opcion) => {
        const activo = tema === opcion.id;
        return (
          <button
            key={opcion.id}
            type="button"
            role="radio"
            aria-checked={activo}
            onClick={() => elegirTema(opcion.id)}
            className={cn(
              "rounded-full px-2 py-1.5 text-xs font-semibold",
              clsFoco,
              activo ? "bg-inverse text-inverse-foreground" : "text-muted-foreground",
            )}
          >
            {opcion.etiqueta}
          </button>
        );
      })}
    </div>
  );
}
