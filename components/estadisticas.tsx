import type { Estadisticas } from "@/lib/db";
import { ETIQUETA_TIPO, TIPOS_REPORTE } from "@/lib/tipos";

export function PanelEstadisticas({ datos }: { datos: Estadisticas }) {
  const tarjetas = [
    { valor: datos.total, etiqueta: "Reportes en la lista" },
    { valor: datos.numerosDistintos, etiqueta: "Números distintos" },
    { valor: datos.ultimos7dias, etiqueta: "En los últimos 7 días" },
  ];

  return (
    <section aria-labelledby="titulo-estadisticas" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 id="titulo-estadisticas" className="font-heading text-2xl">
          La lista colectiva
        </h2>
        <div className="space-y-1 text-sm text-muted-foreground">
          {datos.incluyeEjemplos && <p>Incluye ejemplos ficticios de la demo.</p>}
          {datos.persistencia === "memoria" && (
            <p>Sin base configurada, un reporte nuevo se ve en esta instancia y se pierde cuando se enfría.</p>
          )}
        </div>
      </div>
      <dl className="grid grid-cols-3 gap-3">
        {tarjetas.map((tarjeta) => (
          <div key={tarjeta.etiqueta} className="rounded-2xl bg-card px-3 py-4 ring-1 ring-foreground/10">
            <dt className="text-xs leading-snug text-muted-foreground sm:text-sm">{tarjeta.etiqueta}</dt>
            <dd className="mt-2 font-heading text-3xl tabular-nums">{tarjeta.valor}</dd>
          </div>
        ))}
      </dl>
      <ul className="grid gap-2 sm:grid-cols-2">
        {TIPOS_REPORTE.map((tipo) => (
          <li key={tipo} className="flex items-center justify-between rounded-xl bg-muted/70 px-3 py-2 text-sm">
            <span>{ETIQUETA_TIPO[tipo]}</span>
            <span className="font-semibold tabular-nums">{datos.porTipo[tipo]}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
