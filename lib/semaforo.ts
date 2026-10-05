import { diasEntre } from "./formato";
import {
  ETIQUETA_TIPO_CORTO,
  TIPOS_REPORTE,
  type ColorSemaforo,
  type ConteoReportes,
  type ReporteParaPuntaje,
  type ResultadoNumero,
  type TipoReporte,
} from "./tipos";

export const PESO_TIPO: Record<TipoReporte, number> = {
  comprobante_falso: 40,
  numero_reciclado: 36,
  pidio_devolucion: 24,
  otro: 12,
};

export const UMBRAL_AMARILLO = 18;
export const UMBRAL_ROJO = 55;

const TITULO: Record<ColorSemaforo, string> = {
  verde: "Sin alertas recientes",
  amarillo: "Precaución",
  rojo: "Alto riesgo",
};

export function factorRecencia(dias: number): number {
  if (dias <= 7) return 1;
  if (dias <= 30) return 0.75;
  if (dias <= 90) return 0.45;
  if (dias <= 365) return 0.2;
  return 0.05;
}

function conteoVacio(): Record<TipoReporte, number> {
  return {
    comprobante_falso: 0,
    numero_reciclado: 0,
    pidio_devolucion: 0,
    otro: 0,
  };
}

function fraseReportes(cantidad: number, tipo: TipoReporte, ventana: string): string {
  const etiqueta = ETIQUETA_TIPO_CORTO[tipo];
  if (cantidad === 1) {
    return `1 reporte de ${etiqueta} ${ventana}.`;
  }
  return `${cantidad} reportes de ${etiqueta} ${ventana}.`;
}

function esGrave(tipo: TipoReporte): boolean {
  return tipo === "comprobante_falso" || tipo === "numero_reciclado";
}

export function puntuarNumero(
  reportes: ReporteParaPuntaje[],
  ahora = new Date(),
): ResultadoNumero {
  const porTipo = conteoVacio();
  const porTipo30 = conteoVacio();
  let suma = 0;
  let ultimos30 = 0;
  let graves30 = 0;
  let graves14 = 0;

  for (const reporte of reportes) {
    const dias = Math.max(0, diasEntre(reporte.creadoEn, ahora));
    suma += PESO_TIPO[reporte.tipo] * factorRecencia(dias);
    porTipo[reporte.tipo] += 1;
    if (dias <= 30) {
      ultimos30 += 1;
      porTipo30[reporte.tipo] += 1;
      if (esGrave(reporte.tipo)) graves30 += 1;
    }
    if (dias <= 14 && esGrave(reporte.tipo)) graves14 += 1;
  }

  const puntaje = Math.round(suma);
  let color: ColorSemaforo =
    puntaje >= UMBRAL_ROJO ? "rojo" : puntaje >= UMBRAL_AMARILLO ? "amarillo" : "verde";

  const razones: string[] = [];

  if (reportes.length === 0) {
    razones.push("Nadie ha reportado este número.");
  } else {
    for (const tipo of TIPOS_REPORTE) {
      if (porTipo30[tipo] > 0) {
        razones.push(fraseReportes(porTipo30[tipo], tipo, "en los últimos 30 días"));
      }
    }
    const viejos = reportes.length - ultimos30;
    if (viejos > 0) {
      razones.push(
        viejos === 1
          ? "Hay 1 reporte más viejo, que pesa menos."
          : `Hay ${viejos} reportes más viejos, que pesan menos.`,
      );
    }
  }

  const colorPorPuntaje = color;
  if (graves30 >= 2) {
    color = "rojo";
    if (colorPorPuntaje !== "rojo") {
      razones.push(
        "Regla directa: dos o más reportes graves en 30 días (comprobante falso o número reciclado) encienden el rojo.",
      );
    }
  } else if (graves14 >= 1 && color === "verde") {
    color = "amarillo";
    razones.push(
      "Regla directa: un reporte grave de los últimos 14 días deja el semáforo al menos en amarillo.",
    );
  }

  const conteo: ConteoReportes = {
    total: reportes.length,
    ultimos30,
    porTipo,
  };

  return {
    color,
    titulo: TITULO[color],
    explicacion: explicacion(color, reportes.length),
    razones,
    puntaje,
    conteo,
  };
}

function explicacion(color: ColorSemaforo, total: number): string {
  if (total === 0) {
    return "Este número no tiene reportes en la lista colectiva. Eso no prueba que sea de confianza: puede ser nuevo, o simplemente nadie lo ha marcado.";
  }
  if (color === "verde") {
    return "Los reportes que hay son viejos o de poca gravedad. No alcanzan para encender una alerta. Igual verificá el nombre en tu banco.";
  }
  if (color === "amarillo") {
    return "Hay señales para ir con cuidado. No envíes plata si el nombre del beneficiario no te cierra, y desconfiá si te apuran.";
  }
  return "Varias personas reportaron problemas serios con este número, o el patrón es reciente y grave. Mejor no le envíes plata.";
}
