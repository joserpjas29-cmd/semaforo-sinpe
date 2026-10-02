import { corteLimites, obtenerAlmacen, type FilaReporte, type ModoAlmacen } from "./almacen";
import { esNumeroDemo } from "./ejemplos";
import { formatearTelefono, normalizarTelefono, pareceCelular } from "./telefono";
import { contarEnVentana, excedeLimite, LIMITE_REPORTES, VENTANA_MS } from "./limite";
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
import { createHash } from "node:crypto";

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

export function hashIp(ip: string): string {
  const sal = process.env.RATE_LIMIT_SALT || "semaforo-sinpe-dev";
  return createHash("sha256").update(`${sal}:${ip}`).digest("hex");
}

export async function consultarNumero(telefono: string, ahora = new Date()): Promise<ConsultaNumero | null> {
  const normalizado = normalizarTelefono(telefono);
  if (!normalizado) return null;
  const filas = await (await obtenerAlmacen()).reportesDe(normalizado);

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
  | { ok: false; error: string; codigo: "limite" | "datos" };

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
  const almacen = await obtenerAlmacen();
  const marcas = await almacen.marcasDesde(entrada.ipHash, new Date(ahora.getTime() - VENTANA_MS).toISOString());
  if (excedeLimite(contarEnVentana(marcas, ahora))) {
    return {
      ok: false,
      codigo: "limite",
      error: `Ya mandaste ${LIMITE_REPORTES} reportes en la última hora desde esta conexión. Esperá un rato: el límite existe para frenar abusos.`,
    };
  }

  const creadoEn = ahora.toISOString();
  const id = await almacen.guardar({
    telefono,
    tipo: entrada.tipo,
    descripcion,
    creadoEn,
    ipHash: entrada.ipHash,
    borrarLimitesAntesDe: corteLimites(ahora),
  });
  return { ok: true, id, telefono };
}

export function ipDesdeRequest(request: Request): string {
  const reenviada = request.headers.get("x-forwarded-for");
  if (reenviada) {
    const primera = reenviada.split(",")[0]?.trim();
    if (primera) return primera.slice(0, 80);
  }
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real.slice(0, 80);
  return "local";
}

export function etiquetaTipo(tipo: TipoReporte): string {
  return ETIQUETA_TIPO[tipo];
}

export type { ColorSemaforo };
