"use client";

import { Marca, Puntos } from "@/components/marca";
import { clsBoton } from "@/components/estilos";

export function Bienvenida({ onContinuar }: { onContinuar: () => void }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background lg:flex lg:items-center lg:justify-center lg:bg-black/50 lg:p-8">
      <div className="mx-auto flex min-h-full w-full max-w-lg flex-col bg-background px-6 pt-16 pb-8 lg:min-h-0 lg:rounded-[32px] lg:bg-card lg:px-10 lg:py-12 lg:ring-1 lg:ring-border">
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <Puntos grande />
          <h1 className="mt-8">
            <Marca tamano="lg" acento="azul" />
          </h1>
          <p className="mt-3 max-w-[280px] text-[15px] leading-relaxed text-muted-foreground">
            Detectá estafas antes de transferir.
          </p>
          <p className="mt-8 max-w-[320px] text-sm leading-relaxed text-muted-foreground">
            No te pedimos tu número SINPE. Consultar y reportar usan el celular de la otra persona, y en el
            servidor ese número queda cifrado. Tu historial se queda en este navegador.
          </p>
        </div>
        <button type="button" onClick={onContinuar} className={clsBoton}>
          Continuar
          <span aria-hidden>→</span>
        </button>
        <p className="mt-4 text-center text-[12px] leading-relaxed text-muted-foreground">
          Stopfy es una ayuda educativa. No reemplaza a tu banco ni está afiliada a ningún banco ni al BCCR.
        </p>
      </div>
    </div>
  );
}
