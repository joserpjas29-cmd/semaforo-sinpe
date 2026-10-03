import { obtenerAlmacen, purgarSiToca, type FilaReporte, type ModoAlmacen } from "./almacen";
import { esNumeroDemo } from "./ejemplos";
import { esperaLegible, reglaLimite } from "./limite";
import { limitar } from "./limitador";
import { hashIp, hashTelefono } from "./privacidad";
import { formatearTelefono, normalizarTelefono, pareceCelular } from "./telefono";
import { puntuarNumero } from "./semaforo";
import {
  ETIQUETA_TIPO,
  esTipoReporte,
  RECORDATORIO_ENVIO,
  TIPOS_REPORTE,
  type ColorSemaforo,
  type ResultadoNumero,
  type TipoReporte,
} from "./tipos";

export { hashIp };

export interface ConsultaNumero extends ResultadoNumero {
  telefono: string;
  telefonoFormateado: string;
  esEjemplo: boolean;
  pareceCelular: boolean;
  recordatorio: string;
}

export interface Estadisticas {
  total: number;
  numerosDistintos: number;
  ultimos7dias: number;
  porTipo: Record<TipoReporte, number>;
  incluyeEjemplos: boolean;
  persistencia: ModoAlmacen;
}

export async function consultarNumero(telefono: string, ahora = new Date()): Promise<ConsultaNumero | null> {
  const normalizado = normalizarTelefono(telefono);
  if (!normalizado) return null;
  const almacen = await obtenerAlmacen();
  await purgarSiToca(almacen, ahora);
  const filas = await almacen.reportesDe(hashTelefono(normalizado));

  const reportes = filas
    .filter((fila): fila is FilaReporte & { tipo: TipoReporte } => esTipoReporte(fila.tipo))
    .map((fila) => ({
      tipo: fila.tipo,
      creadoEn: new Date(fila.creado_en),
    }));

  const resultado = puntuarNumero(reportes, ahora);
  return {
    ...resultado,
    telefono: normalizado,
    telefonoFormateado: formatearTelefono(normalizado),
    esEjemplo: filas.some((fila) => fila.es_ejemplo === 1) || esNumeroDemo(normalizado),
    pareceCelular: pareceCelular(normalizado),
    recordatorio: RECORDATORIO_ENVIO,
  };
}

export async function obtenerEstadisticas(ahora = new Date()): Promise<Estadisticas> {
  const almacen = await obtenerAlmacen();
  await purgarSiToca(almacen, ahora);
  const desde7 = new Date(ahora.getTime() - 7 * 86_400_000).toISOString();
  const conteos = await almacen.conteos(desde7);
  const porTipo = Object.fromEntries(TIPOS_REPORTE.map((tipo) => [tipo, 0])) as Record<TipoReporte, number>;
  for (const fila of conteos.porTipo) {
    if (esTipoReporte(fila.tipo)) porTipo[fila.tipo] = Number(fila.n);
  }
  return {
    total: conteos.total,
    numerosDistintos: conteos.numerosDistintos,
    ultimos7dias: conteos.ultimos7dias,
    porTipo,
    incluyeEjemplos: conteos.ejemplos > 0,
    persistencia: almacen.modo,
  };
}

export interface ReporteNuevo {
  telefono: string;
  tipo: TipoReporte;
  descripcion: string;
  ipHash: string;
  ahora?: Date;
}

export type ResultadoReporte =
  | { ok: true; id: number; telefono: string }
  | { ok: false; error: string; codigo: "datos" }
  | { ok: false; error: string; codigo: "limite"; reintentarEnSeg: number };

export async function crearReporte(entrada: ReporteNuevo): Promise<ResultadoReporte> {
  const telefono = normalizarTelefono(entrada.telefono);
  if (!telefono) {
    return {
      ok: false,
      codigo: "datos",
      error: "El celular de Costa Rica tiene 8 dígitos. Si viene con +506, lo podés pegar igual.",
    };
  }
  const descripcion = entrada.descripcion.replace(/\s+/g, " ").trim();
  if (descripcion.length < 12 || descripcion.length > 400 || !/[a-záéíóúüñ]/i.test(descripcion)) {
    return {
      ok: false,
      codigo: "datos",
      error: "Contanos en una frase qué pasó. Sin datos de más: nada de cédulas ni números de cuenta.",
    };
  }

  const ahora = entrada.ahora ?? new Date();
  const telefonoHash = hashTelefono(telefono);

  const reglaIp = reglaLimite("reportar_ip");
  const porConexion = await limitar(reglaIp, entrada.ipHash, ahora);
  if (!porConexion.permitido) {
    return {
      ok: false,
      codigo: "limite",
      reintentarEnSeg: porConexion.reintentarEnSeg,
      error: `Ya mandaste ${reglaIp.maximo} reportes en la última hora desde esta conexión. Esperá ${esperaLegible(porConexion.reintentarEnSeg)}: el límite existe para frenar abusos.`,
    };
  }

  // Tope por número: aunque alguien rote de conexión, un mismo número no se puede inundar de reportes.
  const reglaNumero = reglaLimite("reportar_numero");
  const porNumero = await limitar(reglaNumero, telefonoHash, ahora);
  if (!porNumero.permitido) {
    return {
      ok: false,
      codigo: "limite",
      reintentarEnSeg: porNumero.reintentarEnSeg,
      error: `Este número ya recibió ${reglaNumero.maximo} reportes en las últimas 24 horas y todos cuentan en el semáforo. Si es un caso distinto, probá de nuevo en ${esperaLegible(porNumero.reintentarEnSeg)}.`,
    };
  }

  const almacen = await obtenerAlmacen();
  await purgarSiToca(almacen, ahora);
  const id = await almacen.guardar({
    telefonoHash,
    tipo: entrada.tipo,
    descripcion,
    creadoEn: ahora.toISOString(),
  });
  return { ok: true, id, telefono };
}

const FORMATO_IP = /^[0-9a-fA-F:.]{2,45}$/;

/**
 * IP del visitante. Se prefieren las cabeceras que pone la plataforma (en Vercel el cliente
 * no las puede fijar). Si solo hay X-Forwarded-For se toma el último valor, el que agregó el
 * proxy más cercano, y no el primero, que el visitante puede escribir a su gusto.
 * Detrás de un proxy propio, asegurate de que sobrescriba estas cabeceras.
 */
export function ipDesdeRequest(request: Request): string {
  const cabeceras = request.headers;
  const reenviada = cabeceras.get("x-forwarded-for")?.split(",");
  const candidatas = [
    cabeceras.get("x-vercel-forwarded-for")?.split(",")[0],
    cabeceras.get("x-real-ip"),
    reenviada?.[reenviada.length - 1],
  ];
  for (const candidata of candidatas) {
    const ip = candidata?.trim();
    if (ip && FORMATO_IP.test(ip)) return ip;
  }
  return "local";
}

export function etiquetaTipo(tipo: TipoReporte): string {
  return ETIQUETA_TIPO[tipo];
}

export type { ColorSemaforo };
