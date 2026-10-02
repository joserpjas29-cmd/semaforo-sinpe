import { CircleCheck, ShieldAlert, TriangleAlert } from "lucide-react";
import type { ColorSemaforo } from "@/lib/tipos";
import { cn } from "@/lib/utils";

const LUCES: { id: ColorSemaforo; nombre: string; posicion: string }[] = [
  { id: "rojo", nombre: "Rojo", posicion: "arriba" },
  { id: "amarillo", nombre: "Amarillo", posicion: "al medio" },
  { id: "verde", nombre: "Verde", posicion: "abajo" },
];

const ICONO = {
  rojo: ShieldAlert,
  amarillo: TriangleAlert,
  verde: CircleCheck,
} as const;

const TEXTO = {
  rojo: "text-[#9d241c]",
  amarillo: "text-[#8a5a00]",
  verde: "text-[#0d6b38]",
} as const;

export function Semaforo({
  color = null,
  titulo,
  detalle,
  decorativo = false,
  pulso = false,
}: {
  color?: ColorSemaforo | null;
  titulo?: string;
  detalle?: string;
  decorativo?: boolean;
  pulso?: boolean;
}) {
  const Icono = color ? ICONO[color] : null;
  const etiqueta = color
    ? `Semáforo en ${color}, la luz de ${LUCES.find((luz) => luz.id === color)?.posicion}`
    : "Semáforo apagado";

  return (
    <div
      className="flex flex-col items-center gap-5 text-center"
      role={decorativo ? undefined : "status"}
      aria-live={decorativo ? undefined : "polite"}
    >
      <div className="flex items-center gap-4" aria-hidden={decorativo ? true : undefined}>
        <div className="carcasa" aria-hidden={decorativo ? undefined : true}>
          {LUCES.map((luz) => {
            const encendida = decorativo || color === luz.id;
            return (
              <span
                key={luz.id}
                className={cn(
                  "luz",
                  `luz-${luz.id}`,
                  encendida && "encendida",
                  !decorativo && color !== luz.id && "apagada",
                  pulso && encendida && "pulso",
                )}
              />
            );
          })}
        </div>
        {!decorativo && (
          <ul className="flex flex-col gap-[1.15rem] text-left text-sm">
            {LUCES.map((luz) => (
              <li
                key={luz.id}
                className={cn(
                  "flex h-[3.15rem] items-center font-medium",
                  color === luz.id ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {luz.nombre}
              </li>
            ))}
          </ul>
        )}
      </div>
      {!decorativo && (
        <div className="max-w-md">
          <p className="sr-only">{etiqueta}</p>
          {color && (
            <p className={cn("text-sm font-semibold tracking-[0.16em] uppercase", TEXTO[color])}>
              {LUCES.find((luz) => luz.id === color)?.nombre}
            </p>
          )}
          {titulo && (
            <h2 className="mt-1 flex items-center justify-center gap-2 font-heading text-3xl text-balance">
              {Icono && <Icono className={cn("size-7", color && TEXTO[color])} aria-hidden />}
              {titulo}
            </h2>
          )}
          {detalle && <p className="mt-2 text-base leading-relaxed text-muted-foreground">{detalle}</p>}
        </div>
      )}
    </div>
  );
}
