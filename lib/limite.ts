export const LIMITE_REPORTES = 10;
export const VENTANA_MS = 60 * 60 * 1000;
export const DIA_MS = 24 * VENTANA_MS;

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

export type NombreRegla = "reportar_ip" | "reportar_numero" | "consultar_ip" | "analizar_ip";

export interface ReglaLimite {
  accion: NombreRegla;
  maximo: number;
  ventanaMs: number;
}

function entero(nombre: string, defecto: number): number {
  const crudo = process.env[nombre]?.trim() ?? "";
  // Solo dígitos: "2.5" o "7abc" son errores de configuración y no se adivinan.
  if (!/^\d{1,6}$/.test(crudo)) return defecto;
  const valor = Number(crudo);
  return valor > 0 ? valor : defecto;
}

/**
 * Los máximos se pueden ajustar con variables de entorno sin tocar el código
 * (útil, por ejemplo, si muchas personas comparten la misma red en una demo).
 * Las ventanas son fijas.
 */
export function reglaLimite(nombre: NombreRegla): ReglaLimite {
  switch (nombre) {
    case "reportar_ip":
      return { accion: nombre, maximo: entero("LIMITE_REPORTES_POR_HORA", LIMITE_REPORTES), ventanaMs: VENTANA_MS };
    case "reportar_numero":
      return { accion: nombre, maximo: entero("LIMITE_REPORTES_POR_NUMERO_DIA", 5), ventanaMs: DIA_MS };
    case "consultar_ip":
      return { accion: nombre, maximo: entero("LIMITE_CONSULTAS_POR_HORA", 120), ventanaMs: VENTANA_MS };
    case "analizar_ip":
      return { accion: nombre, maximo: entero("LIMITE_ANALISIS_POR_HORA", 20), ventanaMs: VENTANA_MS };
  }
}

export function esperaLegible(segundos: number): string {
  if (segundos <= 60) return "un minuto";
  if (segundos < 3600) return `${Math.ceil(segundos / 60)} minutos`;
  const horas = Math.ceil(segundos / 3600);
  return horas === 1 ? "una hora" : `${horas} horas`;
}
