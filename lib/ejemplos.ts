import type { ColorSemaforo, TipoReporte } from "./tipos";

export interface ReporteEjemplo {
  telefono: string;
  tipo: TipoReporte;
  diasAtras: number;
  descripcion: string;
}

/** Datos ficticios. Las fechas se calculan al sembrar, relativas a ese momento. */
export const REPORTES_EJEMPLO: ReporteEjemplo[] = [
  {
    telefono: "60603030",
    tipo: "comprobante_falso",
    diasAtras: 2,
    descripcion:
      "Ejemplo ficticio: mandó una captura del SINPE y la plata nunca entró a la cuenta.",
  },
  {
    telefono: "60603030",
    tipo: "numero_reciclado",
    diasAtras: 5,
    descripcion:
      "Ejemplo ficticio: el número antes pertenecía a otra persona y ahora lo usan para cobrar.",
  },
  {
    telefono: "60603030",
    tipo: "pidio_devolucion",
    diasAtras: 9,
    descripcion:
      "Ejemplo ficticio: depositó y enseguida pidió que le devolvieran la plata por el chat.",
  },
  {
    telefono: "70702020",
    tipo: "pidio_devolucion",
    diasAtras: 12,
    descripcion: "Ejemplo ficticio: pidió la devolución de un SINPE que la otra persona no reconocía.",
  },
  {
    telefono: "70702020",
    tipo: "otro",
    diasAtras: 6,
    descripcion: "Ejemplo ficticio: el chat presionaba para cerrar el trato sin dejar verificar.",
  },
  {
    telefono: "88810001",
    tipo: "otro",
    diasAtras: 400,
    descripcion: "Ejemplo ficticio: un aviso viejo que ya no debería alarmar por sí solo.",
  },
];

export interface NumeroDemo {
  telefono: string;
  color: ColorSemaforo;
  nota: string;
}

export const NUMEROS_DEMO: NumeroDemo[] = [
  {
    telefono: "60603030",
    color: "rojo",
    nota: "Comprobante falso, número reciclado y pidió devolución",
  },
  {
    telefono: "70702020",
    color: "amarillo",
    nota: "Pidió devolución y otro aviso reciente",
  },
  {
    telefono: "88810001",
    color: "verde",
    nota: "Solo un reporte viejo, de poca gravedad",
  },
  {
    telefono: "51119090",
    color: "verde",
    nota: "Sin reportes en la lista",
  },
];

export function esNumeroDemo(telefono: string): boolean {
  return NUMEROS_DEMO.some((numero) => numero.telefono === telefono);
}

export interface ComprobanteDemo {
  src: string;
  archivo: string;
  titulo: string;
  detalle: string;
  esperado: ColorSemaforo;
}

export const COMPROBANTES_DEMO: ComprobanteDemo[] = [
  {
    src: "/ejemplos/comprobante-legitimo.png",
    archivo: "comprobante-legitimo.png",
    titulo: "Se ve consistente",
    detalle: "Un banco, fecha pasada, un monto y una referencia larga.",
    esperado: "verde",
  },
  {
    src: "/ejemplos/comprobante-precaucion.png",
    archivo: "comprobante-precaucion.png",
    titulo: "Le falta el SINPE",
    detalle: "Menciona un banco, pero no dice SINPE ni comprobante.",
    esperado: "amarillo",
  },
  {
    src: "/ejemplos/comprobante-sospechoso.png",
    archivo: "comprobante-sospechoso.png",
    titulo: "Varias señales raras",
    detalle: "Fecha imposible, hora imposible, dos montos, dos bancos y referencia corta.",
    esperado: "rojo",
  },
];

export const MENSAJES_DEMO = [
  {
    id: "limpio",
    etiqueta: "Mensaje normal",
    texto: "Listo, ya le hice el SINPE del encargo. Cualquier cosa me avisa.",
  },
  {
    id: "estafa",
    etiqueta: "Guion de estafa",
    texto: "Mae me equivoqué de número, por favor devuélvame la plata ya mismo que es urgente.",
  },
] as const;
