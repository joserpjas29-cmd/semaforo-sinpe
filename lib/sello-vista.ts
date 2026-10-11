/** Datos públicos del sello. No incluye el teléfono ni el texto del reporte. */
export interface SelloVisible {
  tx: string;
  url: string;
}

export const EXPLORADOR_TX = "https://stellar.expert/explorer/testnet/tx/";

export function urlExplorador(tx: string): string {
  return `${EXPLORADOR_TX}${tx}`;
}

/** Hash de transacción de Stellar: 32 bytes en hexadecimal. */
export function txEsSello(valor: string | null | undefined): valor is string {
  return typeof valor === "string" && /^[a-f0-9]{64}$/.test(valor);
}

/**
 * Deja solo sellos que apuntan al explorador de testnet de esa misma transacción.
 * Un enlace a otro sitio no se muestra.
 */
export function sellosParaMostrar(sellos: SelloVisible[] | null | undefined): SelloVisible[] {
  if (!sellos) return [];
  const vistos = new Set<string>();
  const salida: SelloVisible[] = [];
  for (const sello of sellos) {
    if (!sello || !txEsSello(sello.tx) || sello.url !== urlExplorador(sello.tx) || vistos.has(sello.tx)) continue;
    vistos.add(sello.tx);
    salida.push({ tx: sello.tx, url: sello.url });
  }
  return salida;
}
