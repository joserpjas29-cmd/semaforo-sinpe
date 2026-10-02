export const TIPOS_REPORTE = [
  "comprobante_falso",
  "numero_reciclado",
  "pidio_devolucion",
  "otro",
] as const;

export type TipoReporte = (typeof TIPOS_REPORTE)[number];

export type ColorSemaforo = "verde" | "amarillo" | "rojo";

export type Severidad = "alta" | "media";

export interface Senal {
  id: string;
  severidad: Severidad;
  titulo: string;
  detalle: string;
}

export interface ConteoReportes {
  total: number;
  ultimos30: number;
  porTipo: Record<TipoReporte, number>;
}

export interface ResultadoNumero {
  color: ColorSemaforo;
  titulo: string;
  explicacion: string;
  razones: string[];
  puntaje: number;
  conteo: ConteoReportes;
}

export interface ReporteParaPuntaje {
  tipo: TipoReporte;
  creadoEn: Date;
}

export interface DatosComprobante {
  monto: number | null;
  montos: number[];
  fechaTexto: string | null;
  horaTexto: string | null;
  referencia: string | null;
  bancos: string[];
  nombreOrigen: string | null;
  nombreDestino: string | null;
  confianza: number | null;
}

export interface ResultadoComprobante {
  color: ColorSemaforo;
  titulo: string;
  explicacion: string;
  senales: Senal[];
  datos: DatosComprobante;
  recordatorio: string;
}

export interface PalabraOcr {
  texto: string;
  confianza: number;
}

export const ETIQUETA_TIPO: Record<TipoReporte, string> = {
  comprobante_falso: "Comprobante falso",
  numero_reciclado: "Número reciclado",
  pidio_devolucion: "Pidió devolución",
  otro: "Otro",
};

export const ETIQUETA_TIPO_CORTO: Record<TipoReporte, string> = {
  comprobante_falso: "comprobante falso",
  numero_reciclado: "número reciclado",
  pidio_devolucion: "pidió devolución",
  otro: "otro motivo",
};

export const RECORDATORIO_ENVIO =
  "Verificá el nombre del beneficiario que te muestra tu banca antes de confirmar. Si ese nombre no es de quien esperás, no envíes la plata. El semáforo no reemplaza a tu banco.";

export const RECORDATORIO_RECIBO =
  "Confirmá el depósito entrando a tu banca o a la app del banco. Un comprobante en el chat, aunque el semáforo salga verde, no es plata en la cuenta.";

export function esTipoReporte(valor: string): valor is TipoReporte {
  return (TIPOS_REPORTE as readonly string[]).includes(valor);
}
