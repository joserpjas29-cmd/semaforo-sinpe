import { formatearColones, sinTildes } from "./formato";
import {
  RECORDATORIO_RECIBO,
  type ColorSemaforo,
  type DatosComprobante,
  type PalabraOcr,
  type ResultadoComprobante,
  type Senal,
} from "./tipos";

export interface OpcionesAnalisis {
  ahora?: Date;
  confianzaGlobal?: number | null;
  palabras?: PalabraOcr[];
  posibleEdicion?: boolean;
}

interface BancoConocido {
  id: string;
  etiqueta: string;
  patrones: RegExp[];
}

const BANCOS: BancoConocido[] = [
  { id: "banco_nacional", etiqueta: "Banco Nacional", patrones: [/banco nacional/, /\bbncr\b/] },
  { id: "bcr", etiqueta: "Banco de Costa Rica", patrones: [/banco de costa rica/, /\bbcr\b/] },
  { id: "bac", etiqueta: "BAC", patrones: [/\bbac\b/] },
  { id: "popular", etiqueta: "Banco Popular", patrones: [/banco popular/] },
  { id: "davivienda", etiqueta: "Davivienda", patrones: [/davivienda/] },
  { id: "scotiabank", etiqueta: "Scotiabank", patrones: [/scotiabank/, /\bscotia\b/] },
  { id: "promerica", etiqueta: "Promerica", patrones: [/promerica/] },
  { id: "mutual", etiqueta: "Grupo Mutual", patrones: [/grupo mutual/, /mutual alajuela/] },
  { id: "ande", etiqueta: "Caja de ANDE", patrones: [/caja de ande/] },
];

const TITULO: Record<ColorSemaforo, string> = {
  verde: "Sin señales raras",
  amarillo: "Precaución",
  rojo: "Alto riesgo",
};

const EXPLICACION: Record<ColorSemaforo, string> = {
  verde:
    "No vimos señales de alarma en lo que se pudo leer. Igual confirmá el depósito en tu banco: el semáforo no ve tu cuenta.",
  amarillo:
    "Hay algo que no cierra del todo. No entregues el producto ni devuelvas plata hasta ver el movimiento en tu banco.",
  rojo:
    "Hay señales fuertes de que este comprobante o el mensaje no son de fiar. No devuelvas plata y no des el producto por visto.",
};

interface MontosLeidos {
  valores: number[];
  sospechoso: boolean;
}

export function parsearNumero(token: string): number | null {
  const recortado = token.trim();
  if (!recortado || !/\d/.test(recortado)) return null;

  const tienePunto = recortado.includes(".");
  const tieneComa = recortado.includes(",");
  let normalizado = recortado;

  if (tienePunto && tieneComa) {
    if (recortado.lastIndexOf(",") > recortado.lastIndexOf(".")) {
      normalizado = recortado.replace(/\./g, "").replace(",", ".");
    } else {
      normalizado = recortado.replace(/,/g, "");
    }
  } else if (tieneComa && /,\d{3}(?:,\d{3})*$/.test(recortado)) {
    normalizado = recortado.replace(/,/g, "");
  } else if (tieneComa) {
    normalizado = recortado.replace(",", ".");
  } else if (tienePunto && /\.\d{3}(?:\.\d{3})*$/.test(recortado)) {
    normalizado = recortado.replace(/\./g, "");
  }

  const valor = Number(normalizado);
  if (!Number.isFinite(valor)) return null;
  return Math.round(valor * 100) / 100;
}

function cerca(a: number, b: number): boolean {
  return Math.abs(a - b) <= Math.max(1, Math.abs(b) * 0.01);
}

function unicos(valores: number[]): number[] {
  const salida: number[] = [];
  for (const valor of valores) {
    if (!salida.some((existente) => cerca(valor, existente))) salida.push(valor);
  }
  return salida;
}

function tokenNumerico(raw: string): string {
  const coincidencia = raw.match(/[0-9oO][0-9oO.,]*/);
  return coincidencia ? coincidencia[0] : "";
}

function registrarMonto(raw: string, destino: MontosLeidos) {
  const token = tokenNumerico(raw);
  if (!token || !/\d/.test(token)) return;
  const sospechoso = /[a-zA-Z]/.test(token);
  const valor = parsearNumero(token.replace(/[oO]/g, "0"));
  if (valor == null || valor < 0 || valor > 1_000_000_000) return;
  if (valor === 0 && destino.valores.some((existente) => existente > 0)) return;
  if (valor > 0) destino.valores = destino.valores.filter((existente) => existente !== 0);
  destino.sospechoso ||= sospechoso;
  destino.valores.push(valor);
}

export function extraerMontos(texto: string): MontosLeidos {
  const destino: MontosLeidos = { valores: [], sospechoso: false };
  const tramo = "[0-9][0-9oO.,]{0,20}";
  const patrones = [
    new RegExp(`(?:₡\\s*|crc\\s*)(${tramo})`, "gi"),
    new RegExp(`(${tramo})\\s*(?:crc|colones)\\b`, "gi"),
    new RegExp(`(?:monto|total|importe)\\s*[:\\-]?\\s*(?:₡\\s*|crc\\s*)?(${tramo})`, "gi"),
  ];

  for (const patron of patrones) {
    for (const coincidencia of texto.matchAll(patron)) {
      const grupo = coincidencia[1];
      if (grupo) registrarMonto(grupo, destino);
    }
  }

  const plano = sinTildes(texto);
  for (const coincidencia of plano.matchAll(/(\d+(?:[.,]\d+)?)\s*mil\b/gi)) {
    const base = parsearNumero(coincidencia[1] ?? "");
    if (base != null && base > 0 && base < 100_000) {
      destino.valores.push(Math.round(base * 1000 * 100) / 100);
    }
  }

  return { valores: unicos(destino.valores), sospechoso: destino.sospechoso };
}

function fechaCalendarioValida(dia: number, mes: number, anio: number): boolean {
  if (mes < 1 || mes > 12 || dia < 1 || anio < 1000) return false;
  const fecha = new Date(anio, mes - 1, dia);
  return fecha.getFullYear() === anio && fecha.getMonth() === mes - 1 && fecha.getDate() === dia;
}

interface FechaLeida {
  raw: string;
  valida: boolean;
  fecha?: Date;
  futura: boolean;
  antigua: boolean;
}

function inicioDeDia(fecha: Date): number {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()).getTime();
}

function extraerFechas(texto: string, ahora: Date): FechaLeida[] {
  const encontradas: FechaLeida[] = [];
  for (const coincidencia of texto.matchAll(/\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})\b/g)) {
    const dia = Number(coincidencia[1]);
    const mes = Number(coincidencia[2]);
    let anio = Number(coincidencia[3]);
    if (anio < 100) anio += 2000;
    const raw = coincidencia[0];
    if (!fechaCalendarioValida(dia, mes, anio)) {
      encontradas.push({ raw, valida: false, futura: false, antigua: false });
      continue;
    }
    const fecha = new Date(anio, mes - 1, dia, 12, 0, 0, 0);
    encontradas.push({
      raw,
      valida: true,
      fecha,
      futura: inicioDeDia(fecha) > inicioDeDia(ahora),
      antigua: anio < 2015,
    });
  }
  return encontradas;
}

interface HoraLeida {
  raw: string;
  valida: boolean;
  horas?: number;
  minutos?: number;
}

function extraerHoras(texto: string): HoraLeida[] {
  const encontradas: HoraLeida[] = [];
  for (const coincidencia of texto.matchAll(/\b(\d{1,2}):(\d{2})(?::(\d{2}))?\b/g)) {
    const horas = Number(coincidencia[1]);
    const minutos = Number(coincidencia[2]);
    const segundos = coincidencia[3] != null ? Number(coincidencia[3]) : 0;
    const valida = horas <= 23 && minutos <= 59 && segundos <= 59;
    encontradas.push({
      raw: coincidencia[0],
      valida,
      horas: valida ? horas : undefined,
      minutos: valida ? minutos : undefined,
    });
  }
  return encontradas;
}

function extraerReferencia(texto: string): string | null {
  const plano = sinTildes(texto).replace(/\n+/g, " ");
  const coincidencia = plano.match(
    /(?:referencia|numero de referencia|\bref\b\.?)\s*[:#.\-]?\s*([a-z0-9][a-z0-9-]{1,40})/i,
  );
  return coincidencia?.[1] ?? null;
}

function problemaReferencia(referencia: string): string | null {
  const limpio = referencia.replace(/-/g, "");
  if (limpio.length < 6) {
    return `tiene ${limpio.length} ${limpio.length === 1 ? "carácter" : "caracteres"}; una referencia de SINPE suele ser más larga`;
  }
  if (limpio.length > 30) return "es demasiado larga para una referencia habitual";
  if (!/^[a-z0-9]+$/i.test(limpio)) return "tiene símbolos que no suelen ir en una referencia";
  if (/^(.)\1+$/i.test(limpio)) return "repite el mismo carácter, como un relleno";
  if (/^(123456|12345678|123456789|000000|111111|999999)$/i.test(limpio)) {
    return "parece un número de relleno y no una referencia real";
  }
  return null;
}

function detectarBancos(texto: string): BancoConocido[] {
  const plano = sinTildes(texto).toLowerCase();
  return BANCOS.filter((banco) => banco.patrones.some((patron) => patron.test(plano)));
}

function campo(texto: string, patron: RegExp): string | null {
  const coincidencia = texto.match(patron);
  if (!coincidencia?.[1]) return null;
  const valor = coincidencia[1].replace(/\s+/g, " ").trim();
  if (valor.length < 3 || valor.length > 80) return null;
  return valor;
}

function mediana(valores: number[]): number | null {
  if (valores.length === 0) return null;
  const orden = [...valores].sort((a, b) => a - b);
  const medio = Math.floor(orden.length / 2);
  if (orden.length % 2 === 1) return orden[medio] ?? null;
  const izquierda = orden[medio - 1];
  const derecha = orden[medio];
  if (izquierda == null || derecha == null) return null;
  return (izquierda + derecha) / 2;
}

function confianzaDelMonto(palabras: PalabraOcr[] | undefined, monto: number | null): number | null {
  if (!palabras?.length || monto == null) return null;
  let mejor: number | null = null;
  for (let indice = 0; indice < palabras.length; indice += 1) {
    const actual = palabras[indice];
    if (!actual) continue;
    const siguiente = palabras[indice + 1];
    const candidatos = [actual.texto];
    if (siguiente) candidatos.push(`${actual.texto}${siguiente.texto}`);
    for (const candidato of candidatos) {
      const token = tokenNumerico(candidato).replace(/[oO]/g, "0");
      const valor = parsearNumero(token);
      if (valor != null && cerca(valor, monto)) {
        mejor = actual.confianza;
      }
    }
  }
  return mejor;
}

const GUIONES: { id: string; titulo: string; detalle: string; patron: RegExp }[] = [
  {
    id: "guion_equivocacion",
    titulo: "Dice que se equivocó",
    detalle:
      "El mensaje habla de un error o de un depósito de más. Es el arranque típico para pedirte que devuelvas plata que nunca entró.",
    patron: /me equivoque|numero equivocado|por error|deposite de mas|deposito de mas/,
  },
  {
    id: "guion_devolucion",
    titulo: "Pide que le devuelvas la plata",
    detalle:
      "Te están pidiendo una devolución, un reintegro o el vuelto. Si el depósito no está en tu banco, devolver es regalar plata.",
    patron:
      /\b(devolveme|devolvemelo|devuelvame|devuelvamelo|devuelva|devolver|devolve|devolucion|reintegro|reembolso|el vuelto|depositeme)\b/,
  },
  {
    id: "guion_urgencia",
    titulo: "Te está apurando",
    detalle:
      "Hay prisa en el mensaje. La urgencia sirve para que no abras el banco y confirmes con calma.",
    patron: /urgente|urgencia|ya mismo|ahora mismo|\brapido\b|apurate|sin falta/,
  },
  {
    id: "guion_presion",
    titulo: "Hay presión o amenaza",
    detalle:
      "El mensaje empuja con denuncia, policía o una cuenta que se cierra. Un pago de verdad no necesita esa presión.",
    patron: /te voy a denunci|voy a denunci|policia|se me cierra|me van a cerrar|no me dejes plantad/,
  },
  {
    id: "guion_historia",
    titulo: "Historia para ablandarte",
    detalle:
      "Aparece una emergencia, un hospital o un familiar. Ese relato se usa para que sueltes la plata antes de verificar.",
    patron: /hospital|emergencia|mi hijo|mi hija|mi mama|mi papa|accidente/,
  },
];

function senalesDelMensaje(mensaje: string): Senal[] {
  const plano = sinTildes(mensaje).toLowerCase();
  if (!plano.trim()) return [];
  return GUIONES.filter((guion) => guion.patron.test(plano)).map((guion) => ({
    id: guion.id,
    severidad: "alta" as const,
    titulo: guion.titulo,
    detalle: guion.detalle,
  }));
}

function colorDe(senales: Senal[]): ColorSemaforo {
  if (senales.some((senal) => senal.severidad === "alta")) return "rojo";
  if (senales.some((senal) => senal.severidad === "media")) return "amarillo";
  return "verde";
}

export function analizarComprobante(
  textoOcr: string,
  mensajeCliente = "",
  opciones: OpcionesAnalisis = {},
): ResultadoComprobante {
  const ahora = opciones.ahora ?? new Date();
  const texto = textoOcr.replace(/\r/g, "");
  const montosRecibo = extraerMontos(texto);
  const montosMensaje = extraerMontos(mensajeCliente);
  const fechas = extraerFechas(texto, ahora);
  const horas = extraerHoras(texto);
  const referencia = extraerReferencia(texto);
  const bancos = detectarBancos(texto);
  const nombreOrigen = campo(texto, /(?:^|\n)\s*(?:de|origen|ordenante)\s*:\s*([^\n]+)/i);
  const nombreDestino = campo(texto, /(?:^|\n)\s*(?:para|destino|beneficiario)\s*:\s*([^\n]+)/i);

  const senales: Senal[] = [];
  const problemasFecha: string[] = [];
  const fechaInvalida = fechas.find((fecha) => !fecha.valida);
  const horaInvalida = horas.find((hora) => !hora.valida);
  const fechaFutura = fechas.find((fecha) => fecha.futura);
  const fechaAntigua = fechas.find((fecha) => fecha.antigua);

  if (fechaInvalida) {
    problemasFecha.push(`La fecha ${fechaInvalida.raw} no existe en el calendario.`);
  }
  if (horaInvalida) {
    problemasFecha.push(`La hora ${horaInvalida.raw} no es una hora real.`);
  }
  if (fechaFutura) {
    problemasFecha.push(
      `La fecha ${fechaFutura.raw} está en el futuro. Un pago que todavía no pasa no puede estar en tu cuenta.`,
    );
  }

  const fechaValida = fechas.find((fecha) => fecha.valida && fecha.fecha);
  const horaValida = horas.find((hora) => hora.valida && hora.horas != null && hora.minutos != null);
  if (fechaValida?.fecha && horaValida?.horas != null && horaValida.minutos != null && !fechaValida.futura) {
    const completa = new Date(
      fechaValida.fecha.getFullYear(),
      fechaValida.fecha.getMonth(),
      fechaValida.fecha.getDate(),
      horaValida.horas,
      horaValida.minutos,
      0,
      0,
    );
    if (completa.getTime() > ahora.getTime() + 10 * 60 * 1000) {
      problemasFecha.push(
        `La hora ${horaValida.raw} de esa fecha todavía no llega. Un comprobante no puede adelantarse al reloj.`,
      );
    }
  }

  if (fechaAntigua) {
    problemasFecha.push(
      `La fecha ${fechaAntigua.raw} es anterior a 2015, cuando SINPE Móvil ya se usaba de forma amplia. Para un pago de ahora, es raro.`,
    );
  }

  if (problemasFecha.length > 0) {
    senales.push({
      id: "fecha_imposible",
      severidad: "alta",
      titulo: "Fecha u hora imposible",
      detalle: problemasFecha.join(" "),
    });
  }

  if (referencia) {
    const problema = problemaReferencia(referencia);
    if (problema) {
      senales.push({
        id: "referencia_invalida",
        severidad: "alta",
        titulo: "Referencia con un patrón raro",
        detalle: `La referencia «${referencia}» ${problema}.`,
      });
    }
  }

  if (montosRecibo.valores.some((monto) => monto === 0)) {
    senales.push({
      id: "monto_no_cuadra",
      severidad: "alta",
      titulo: "El monto no cuadra",
      detalle: "El monto leído es cero. Un comprobante de un pago real no debería decir eso.",
    });
  } else if (montosRecibo.valores.length >= 2) {
    senales.push({
      id: "monto_no_cuadra",
      severidad: "alta",
      titulo: "El monto no cuadra",
      detalle: `En el comprobante aparecen montos distintos: ${montosRecibo.valores
        .map((monto) => formatearColones(monto))
        .join(" y ")}.`,
    });
  } else if (
    montosRecibo.valores.length === 1 &&
    montosMensaje.valores.some((monto) => !cerca(monto, montosRecibo.valores[0] ?? 0))
  ) {
    const delRecibo = formatearColones(montosRecibo.valores[0] ?? 0);
    const delMensaje = montosMensaje.valores.map((monto) => formatearColones(monto)).join(" y ");
    senales.push({
      id: "monto_no_cuadra",
      severidad: "alta",
      titulo: "El monto no cuadra",
      detalle: `El comprobante dice ${delRecibo} y el mensaje habla de ${delMensaje}.`,
    });
  }

  if (bancos.length >= 2) {
    senales.push({
      id: "formato_inconsistente",
      severidad: "alta",
      titulo: "Formato que no cuadra con un solo banco",
      detalle: `El texto nombra más de un banco (${bancos
        .map((banco) => banco.etiqueta)
        .join(" y ")}). Un comprobante de SINPE Móvil corresponde a una sola entidad.`,
    });
  } else if (bancos.length === 1 && !/\bsinpe\b/i.test(sinTildes(texto))) {
    senales.push({
      id: "formato_inconsistente",
      severidad: "media",
      titulo: "No parece un comprobante SINPE",
      detalle: `Aparece ${bancos[0]?.etiqueta}, pero el texto no dice SINPE. Puede ser un recorte, otra transferencia o una edición. Pedí que se vea completo.`,
    });
  }

  const montoPrincipal = montosRecibo.valores[0] ?? null;
  const confianzaMonto = confianzaDelMonto(opciones.palabras, montoPrincipal);
  const confianzaMediana = mediana(
    (opciones.palabras ?? []).map((palabra) => palabra.confianza).filter((valor) => valor >= 0),
  );
  const edicionPorConfianza =
    confianzaMonto != null &&
    confianzaMediana != null &&
    confianzaMonto < 60 &&
    confianzaMediana - confianzaMonto >= 30;

  if (montosRecibo.sospechoso || edicionPorConfianza || opciones.posibleEdicion) {
    const motivos: string[] = [];
    if (montosRecibo.sospechoso) {
      motivos.push("El monto mezcla letras y números, como si le hubieran escrito encima.");
    }
    if (edicionPorConfianza) {
      motivos.push(
        "El monto se lee con mucha menos seguridad que el resto del texto. Eso pasa cuando hay un número pegado arriba.",
      );
    }
    if (opciones.posibleEdicion) {
      motivos.push("La lectura con modelo de visión marcó señales visuales de edición.");
    }
    senales.push({
      id: "edicion_evidente",
      severidad: "alta",
      titulo: "Parece editado",
      detalle: motivos.join(" "),
    });
  }

  senales.push(...senalesDelMensaje(mensajeCliente));

  const fechaOk = fechas.some((fecha) => fecha.valida && !fecha.futura && !fecha.antigua);
  const referenciaOk = referencia != null && problemaReferencia(referencia) == null;
  const montoOk = montosRecibo.valores.length === 1 && (montosRecibo.valores[0] ?? 0) > 0;
  const horaOk = horas.every((hora) => hora.valida);
  const evidencia = montoOk && (fechaOk || referenciaOk) && horaOk && !fechas.some((fecha) => !fecha.valida);

  const nada =
    montosRecibo.valores.length === 0 &&
    !referencia &&
    fechas.length === 0 &&
    horas.length === 0 &&
    bancos.length === 0;

  if (nada) {
    senales.unshift({
      id: "lectura_insuficiente",
      severidad: "media",
      titulo: "No se pudo leer el comprobante",
      detalle:
        "No encontramos monto, fecha ni referencia. Esto no es una luz verde: subí una captura más nítida o confirmá el depósito en tu banco.",
    });
  } else if (!evidencia && senales.length === 0) {
    senales.push({
      id: "datos_incompletos",
      severidad: "media",
      titulo: "Faltan datos para dar luz verde",
      detalle:
        "Leímos solo una parte. Sin un monto claro y sin una fecha o referencia coherentes, no da para tratarlo como consistente.",
    });
  }

  const color = colorDe(senales);
  const datos: DatosComprobante = {
    monto: montoPrincipal,
    montos: montosRecibo.valores,
    fechaTexto: fechas[0]?.raw ?? null,
    horaTexto: horas[0]?.raw ?? null,
    referencia,
    bancos: bancos.map((banco) => banco.etiqueta),
    nombreOrigen,
    nombreDestino,
    confianza: opciones.confianzaGlobal ?? null,
  };

  return {
    color,
    titulo: TITULO[color],
    explicacion: EXPLICACION[color],
    senales,
    datos,
    recordatorio: RECORDATORIO_RECIBO,
  };
}
