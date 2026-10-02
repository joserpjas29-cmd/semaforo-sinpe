export function formatearColones(valor: number): string {
  const negativo = valor < 0;
  const absoluto = Math.abs(valor);
  const [entero, decimal] = absoluto.toFixed(2).split(".");
  const conPuntos = entero.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${negativo ? "-" : ""}₡${conPuntos},${decimal}`;
}

export function sinTildes(texto: string): string {
  return texto.normalize("NFD").replace(/\p{M}/gu, "");
}

export function diasEntre(desde: Date, hasta: Date): number {
  const ms = hasta.getTime() - desde.getTime();
  return Math.floor(ms / 86_400_000);
}
