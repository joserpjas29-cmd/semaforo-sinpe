import type { ColorSemaforo } from "@/lib/tipos";

const CLAVE = "stopfy-historial";
const EVENTO = "stopfy-historial";
const TOPE = 40;
const VACIO: EntradaHistorial[] = [];

let cache: EntradaHistorial[] = VACIO;
let cacheCrudo: string | null = null;

export type TipoConsulta = "numero" | "comprobante" | "sms";

export interface EntradaHistorial {
  id: string;
  tipo: TipoConsulta;
  color: ColorSemaforo;
  titulo: string;
  fecha: string;
  telefono?: string;
  puntaje?: number;
}

export function etiquetaCuando(iso: string, ahora = new Date()): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return "";
  const hora = new Intl.DateTimeFormat("es-CR", { hour: "numeric", minute: "2-digit" }).format(fecha);
  const mismoDia =
    fecha.getFullYear() === ahora.getFullYear() &&
    fecha.getMonth() === ahora.getMonth() &&
    fecha.getDate() === ahora.getDate();
  if (mismoDia) return `Hoy, ${hora}`;
  const dia = new Intl.DateTimeFormat("es-CR", {
    day: "numeric",
    month: "short",
    year: fecha.getFullYear() === ahora.getFullYear() ? undefined : "numeric",
  }).format(fecha);
  return `${dia}, ${hora}`;
}

function esColor(valor: unknown): valor is ColorSemaforo {
  return valor === "verde" || valor === "amarillo" || valor === "rojo";
}

function esTipo(valor: unknown): valor is TipoConsulta {
  return valor === "numero" || valor === "comprobante" || valor === "sms";
}

function esEntrada(valor: unknown): valor is EntradaHistorial {
  if (!valor || typeof valor !== "object") return false;
  const entrada = valor as EntradaHistorial;
  return (
    typeof entrada.id === "string" &&
    esTipo(entrada.tipo) &&
    esColor(entrada.color) &&
    typeof entrada.titulo === "string" &&
    typeof entrada.fecha === "string"
  );
}

export function leerHistorial(): EntradaHistorial[] {
  if (typeof window === "undefined") return VACIO;
  try {
    const crudo = window.localStorage.getItem(CLAVE);
    if (crudo === cacheCrudo) return cache;
    cacheCrudo = crudo;
    if (!crudo) {
      cache = VACIO;
      return cache;
    }
    const datos = JSON.parse(crudo) as unknown;
    cache = Array.isArray(datos) ? datos.filter(esEntrada) : VACIO;
    return cache;
  } catch {
    return cache;
  }
}

export function suscribirHistorial(alCambiar: () => void): () => void {
  window.addEventListener("storage", alCambiar);
  window.addEventListener(EVENTO, alCambiar);
  return () => {
    window.removeEventListener("storage", alCambiar);
    window.removeEventListener(EVENTO, alCambiar);
  };
}

export function historialServidor(): EntradaHistorial[] {
  return VACIO;
}

export function guardarHistorial(entrada: Omit<EntradaHistorial, "id" | "fecha">): void {
  if (typeof window === "undefined") return;
  try {
    const previas = leerHistorial();
    const ahora = Date.now();
    const ultima = previas[0];
    if (
      ultima &&
      ultima.tipo === entrada.tipo &&
      ultima.color === entrada.color &&
      ultima.titulo === entrada.titulo &&
      ultima.telefono === entrada.telefono &&
      ultima.puntaje === entrada.puntaje &&
      ahora - new Date(ultima.fecha).getTime() < 4000
    ) {
      return;
    }
    const nueva: EntradaHistorial = {
      ...entrada,
      id: crypto.randomUUID(),
      fecha: new Date(ahora).toISOString(),
    };
    window.localStorage.setItem(CLAVE, JSON.stringify([nueva, ...previas].slice(0, TOPE)));
    cacheCrudo = null;
    window.dispatchEvent(new Event(EVENTO));
  } catch {
    // El historial es local y opcional. Si el navegador lo bloquea, la consulta sigue.
  }
}
