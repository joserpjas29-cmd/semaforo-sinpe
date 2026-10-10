import { cn } from "@/lib/utils";

export function Marca({
  tamano = "md",
  acento = "teal",
  className,
}: {
  tamano?: "md" | "lg";
  acento?: "teal" | "azul";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "font-extrabold tracking-[-0.045em] text-[#0F172A]",
        tamano === "lg" ? "text-[40px] leading-none" : "text-[22px] leading-none",
        className,
      )}
    >
      Stop
      <span className={acento === "azul" ? "text-[#1D4ED8]" : "text-[#0D9488]"}>fy</span>
    </span>
  );
}

export function Puntos({ className, grande = false }: { className?: string; grande?: boolean }) {
  const tamano = grande ? "size-2.5" : "size-2";
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)} aria-hidden>
      <span className={cn(tamano, "rounded-full bg-[#16A34A]")} />
      <span className={cn(tamano, "rounded-full bg-[#F59E0B]")} />
      <span className={cn(tamano, "rounded-full bg-[#DC2626]")} />
    </span>
  );
}
