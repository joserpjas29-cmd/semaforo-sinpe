import { sellosParaMostrar, type SelloVisible } from "@/lib/sello-vista";

/**
 * Indicador discreto. No usa los colores del semáforo: el sello no es un nivel de riesgo.
 * Si no hay un enlace real a la testnet, no se muestra nada.
 */
export function SelloStellar({ sellos }: { sellos: SelloVisible[] }) {
  const visibles = sellosParaMostrar(sellos);
  if (visibles.length === 0) return null;

  return (
    <aside className="rounded-[16px] border border-border bg-muted px-4 py-3 text-left text-sm leading-relaxed text-muted-foreground">
      <p className="font-semibold text-foreground">Reporte sellado en Stellar</p>
      <p className="mt-1">
        Es la red de pruebas (testnet), no la red principal. Publicamos un hash del reporte, sin el número ni el texto.
        Marca que el reporte existía en ese momento. No prueba que la estafa haya ocurrido.
      </p>
      {visibles.length > 1 && <p className="mt-1">Hay {visibles.length} sellos en la red de pruebas.</p>}
      <ul className="mt-2 space-y-1">
        {visibles.map((sello, indice) => (
          <li key={sello.tx}>
            <a
              href={sello.url}
              target="_blank"
              rel="noreferrer noopener"
              className="font-semibold text-link underline-offset-4 hover:underline"
            >
              {visibles.length === 1
                ? "Comprobar en el explorador de testnet"
                : `Comprobar sello ${indice + 1} (${sello.tx.slice(0, 8)}…)`}
            </a>
          </li>
        ))}
      </ul>
    </aside>
  );
}
