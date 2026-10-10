"use client";

import { clsBoton } from "@/components/estilos";

export default function ErrorPagina({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-4 py-16">
      <h1 className="text-[28px] font-extrabold tracking-tight text-foreground">Algo se trabó</h1>
      <p className="text-[15px] leading-relaxed text-muted-foreground">
        Volvé a intentar. Si estabas analizando un comprobante, la primera lectura a veces tarda un toque más.
      </p>
      <button type="button" onClick={reset} className={clsBoton}>
        Reintentar
      </button>
    </div>
  );
}
