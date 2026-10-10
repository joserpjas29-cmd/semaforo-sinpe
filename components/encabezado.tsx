import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { clsFoco } from "@/components/estilos";
import { cn } from "@/lib/utils";

export function Encabezado({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <header>
      <Link
        href="/"
        aria-label="Volver al inicio"
        className={cn("inline-flex size-10 items-center justify-center rounded-full text-foreground", clsFoco)}
      >
        <ChevronLeft className="size-6" />
      </Link>
      <h1 className="mt-3 text-[28px] leading-tight font-extrabold tracking-[-0.03em] text-foreground">{titulo}</h1>
      <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">{texto}</p>
    </header>
  );
}

export function TituloPantalla({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <header>
      <h1 className="text-[28px] leading-tight font-extrabold tracking-[-0.03em] text-foreground">{titulo}</h1>
      <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">{texto}</p>
    </header>
  );
}
