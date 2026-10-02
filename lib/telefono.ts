export function normalizarTelefono(entrada: string): string | null {
  let digitos = entrada.replace(/\D/g, "");
  if (digitos.startsWith("00506")) {
    digitos = digitos.slice(5);
  } else if (digitos.startsWith("506") && digitos.length >= 11) {
    digitos = digitos.slice(3);
  }
  if (!/^\d{8}$/.test(digitos)) return null;
  return digitos;
}

export function formatearTelefono(digitos: string): string {
  return `${digitos.slice(0, 4)} ${digitos.slice(4)}`;
}

/** SINPE Móvil se usa con celulares. En Costa Rica suelen empezar con 5, 6, 7 u 8. */
export function pareceCelular(digitos: string): boolean {
  return /^[5678]\d{7}$/.test(digitos);
}
