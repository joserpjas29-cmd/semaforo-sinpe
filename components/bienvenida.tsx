"use client";

import { Marca, Puntos } from "@/components/marca";
import { clsBoton } from "@/components/estilos";

export function Bienvenida({ onContinuar }: { onContinuar: () => void }) {
  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-[#F8FAFC] md:bg-[#E7EDF5]">
      <div className="mx-auto flex min-h-full w-full max-w-[430px] flex-col bg-[#F8FAFC] px-6 pt-16 pb-8 md:my-6 md:min-h-[calc(100dvh-3rem)] md:rounded-[32px] md:ring-1 md:ring-[#E2E8F0]">
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <Puntos grande />
          <h1 className="mt-8">
            <Marca tamano="lg" acento="azul" />
          </h1>
          <p className="mt-3 max-w-[280px] text-[15px] leading-relaxed text-[#64748B]">
            Detectá estafas antes de transferir.
          </p>
          <p className="mt-8 max-w-[320px] text-sm leading-relaxed text-[#64748B]">
            No te pedimos tu número SINPE. Consultar y reportar usan el celular de la otra persona, y en el
            servidor ese número queda cifrado. Tu historial se queda en este navegador.
          </p>
        </div>
        <button type="button" onClick={onContinuar} className={clsBoton}>
          Continuar
          <span aria-hidden>→</span>
        </button>
        <p className="mt-4 text-center text-[12px] leading-relaxed text-[#94A3B8]">
          Stopfy es una ayuda educativa. No reemplaza a tu banco ni está afiliada a ningún banco ni al BCCR.
        </p>
      </div>
    </div>
  );
}
