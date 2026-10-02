"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPagina({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto flex min-h-[50vh] w-full max-w-lg flex-col items-start justify-center gap-4 px-4 py-16">
      <h1 className="font-heading text-4xl">Algo se trabó</h1>
      <p className="text-muted-foreground">
        Volvé a intentar. Si estabas analizando un comprobante, la primera lectura a veces tarda un
        toque más.
      </p>
      <Button type="button" onClick={reset} className="h-12 px-5 text-base">
        Reintentar
      </Button>
    </div>
  );
}
