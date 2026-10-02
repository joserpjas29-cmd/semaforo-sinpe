export const LIMITE_REPORTES = 10;
export const VENTANA_MS = 60 * 60 * 1000;

export function contarEnVentana(marcasIso: string[], ahora: Date, ventanaMs = VENTANA_MS): number {
  const corte = ahora.getTime() - ventanaMs;
  return marcasIso.filter((marca) => {
    const tiempo = new Date(marca).getTime();
    return Number.isFinite(tiempo) && tiempo >= corte;
  }).length;
}

export function excedeLimite(cantidad: number, maximo = LIMITE_REPORTES): boolean {
  return cantidad >= maximo;
}
