import type { Estadisticas } from "@/lib/db";
import { ETIQUETA_TIPO, TIPOS_REPORTE } from "@/lib/tipos";

export function PanelEstadisticas({ datos }: { datos: Estadisticas }) {
  const tarjetas = [
    { valor: datos.total, etiqueta: "Reportes en la lista" },
    { valor: datos.numerosDistintos, etiqueta: "Números distintos" },
    { valor: datos.ultimos7dias, etiqueta: "En los últimos 7 días" },
  ];

  return (
    <section aria-labelledby="titulo-estadisticas" className="space-y-3">
      <div>
        <h2 id="titulo-estadisticas" className="text-lg font-extrabold tracking-tight text-[#0F172A]">
          La lista, ahora
        </h2>
        <div className="mt-1 space-y-1 text-sm leading-relaxed text-[#64748B]">
          {datos.incluyeEjemplos && <p>Incluye ejemplos ficticios de la demo.</p>}
          {datos.persistencia === "memoria" && (
            <p>Sin base configurada, un reporte nuevo se ve en esta instancia y se pierde cuando se enfría.</p>
          )}
        </div>
      </div>
      <dl className="grid grid-cols-3 gap-2">
        {tarjetas.map((tarjeta) => (
          <div key={tarjeta.etiqueta} className="rounded-[16px] border border-[#E2E8F0] bg-white px-2.5 py-3">
            <dd className="text-2xl font-extrabold tracking-tight text-[#0F172A] tabular-nums">{tarjeta.valor}</dd>
            <dt className="mt-1 text-[11px] leading-snug text-[#64748B]">{tarjeta.etiqueta}</dt>
          </div>
        ))}
      </dl>
      <ul className="overflow-hidden rounded-[16px] border border-[#E2E8F0] bg-white">
        {TIPOS_REPORTE.map((tipo) => (
          <li key={tipo} className="flex items-center justify-between border-b border-[#E2E8F0] px-4 py-3 text-sm last:border-b-0">
            <span className="text-[#0F172A]">{ETIQUETA_TIPO[tipo]}</span>
            <span className="font-semibold text-[#0F172A] tabular-nums">{datos.porTipo[tipo]}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
