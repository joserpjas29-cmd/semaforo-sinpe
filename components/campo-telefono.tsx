import { formatearTelefono } from "@/lib/telefono";
import { cn } from "@/lib/utils";

export function presentarEntrada(valor: string): string {
  let digitos = valor.replace(/\D/g, "");
  if (digitos.startsWith("00506")) digitos = digitos.slice(5);
  else if (digitos.startsWith("506") && digitos.length > 8) digitos = digitos.slice(3);
  digitos = digitos.slice(0, 8);
  if (digitos.length <= 4) return digitos;
  return formatearTelefono(digitos);
}

export function CampoTelefono({
  id,
  value,
  onChange,
  descritoPor,
  invalido = false,
  tono = "activo",
}: {
  id: string;
  value: string;
  onChange: (valor: string) => void;
  descritoPor?: string;
  invalido?: boolean;
  tono?: "activo" | "suave";
}) {
  return (
    <div
      className={cn(
        "flex h-14 items-center rounded-[16px] border-2 bg-white px-4",
        invalido ? "border-[#DC2626]" : tono === "activo" ? "border-[#1D4ED8]" : "border-[#E2E8F0] focus-within:border-[#1D4ED8]",
      )}
    >
      <span className="text-base font-semibold text-[#1D4ED8]" aria-hidden>
        +506
      </span>
      <span className="mx-3 h-6 w-px bg-[#E2E8F0]" aria-hidden />
      <input
        id={id}
        name="telefono"
        inputMode="numeric"
        autoComplete="tel"
        placeholder="8888 8888"
        value={value}
        aria-invalid={invalido || undefined}
        aria-describedby={descritoPor}
        onChange={(evento) => onChange(presentarEntrada(evento.target.value))}
        className="w-full bg-transparent text-lg font-semibold tracking-wide text-[#0F172A] outline-none placeholder:font-medium placeholder:text-[#CBD5E1]"
      />
    </div>
  );
}
