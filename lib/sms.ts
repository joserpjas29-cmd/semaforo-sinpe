import { sinTildes } from "./formato";
import type { ColorSemaforo } from "./tipos";

/** Revisión educativa. No afirma que el mensaje sea real ni que venga de un banco. */
export const AVISO_SMS =
  "Esto no se conecta a ningún banco y no puede probar que el mensaje sea real. Es una revisión educativa del texto: no consulta SINPE ni tu cuenta.";

/** El análisis corre en el navegador. El SMS no se manda ni se guarda. */
export const PRIVACIDAD_SMS =
  "El SMS y la nota se revisan en este navegador. No se envían a un servidor ni se guardan.";

export type VeredictoSms = "sospechoso" | "poco_claro" | "se_ve_normal";

export interface ResultadoSms {
  veredicto: VeredictoSms;
  color: ColorSemaforo;
  titulo: string;
  explicacion: string;
  razones: string[];
  aviso: string;
}

export interface EjemploSms {
  id: string;
  etiqueta: string;
  texto: string;
  nota?: string;
  veredicto: VeredictoSms;
}

export const EJEMPLOS_SMS: EjemploSms[] = [
  {
    id: "normal",
    etiqueta: "Se ve normal",
    veredicto: "se_ve_normal",
    texto: `BNCR: SINPE Movil recibido
De: MARIA SOLIS QUIROS
Monto: CRC 15.000,00
Fecha: 02/10/2026 14:32
Referencia: 4829173650`,
  },
  {
    id: "sospechoso",
    etiqueta: "Sospechoso",
    veredicto: "sospechoso",
    texto: `BANCO NACIONL: Su cuenta sera bloqueada.
Confirme su SINPEE de inmediato en http://bncr-seguro.xyz/login
Remitente: BNCR-ALERTA`,
  },
  {
    id: "poco-claro",
    etiqueta: "No está claro",
    veredicto: "poco_claro",
    texto: `Banco Nacional
Recibiste una transferencia.
Gracias por preferirnos.`,
  },
];

const TITULO: Record<VeredictoSms, string> = {
  sospechoso: "Sospechoso",
  poco_claro: "No está claro",
  se_ve_normal: "Se ve normal",
};

const COLOR: Record<VeredictoSms, ColorSemaforo> = {
  sospechoso: "rojo",
  poco_claro: "amarillo",
  se_ve_normal: "verde",
};

const EXPLICACION: Record<VeredictoSms, string> = {
  sospechoso:
    "Hay señales de un mensaje falso. No abras enlaces, no des claves y no des por hecho el pago.",
  poco_claro:
    "Faltan datos o hay algo que no cierra. No te guíes solo por este texto: mirá el movimiento en tu banco.",
  se_ve_normal:
    "El texto se parece a un SMS de comprobante y no vimos señales claras de estafa. Igual puede ser falso: confirmá el depósito en tu banco.",
};

const LIMITE_TEXTO = 4000;
const TOPE_RAZONES = 6;

type Nivel = "alta" | "media";

interface Hallazgo {
  id: string;
  nivel: Nivel;
  razon: string;
}

interface BancoConocido {
  id: string;
  patrones: RegExp[];
}

const BANCOS: BancoConocido[] = [
  {
    id: "banco_nacional",
    patrones: [/\bbanco nacional\b(?!\s+de\s+(?:america|los estados unidos|mexico|espana|panama|colombia)\b)/, /\bbncr\b/],
  },
  { id: "bcr", patrones: [/banco de costa rica/, /\bbcr\b/] },
  { id: "bac", patrones: [/\bbac\b/] },
  { id: "popular", patrones: [/banco popular/] },
  { id: "davivienda", patrones: [/davivienda/] },
  { id: "scotiabank", patrones: [/scotiabank/, /\bscotia\b/] },
  { id: "promerica", patrones: [/promerica/] },
  { id: "mutual", patrones: [/grupo mutual/, /mutual alajuela/] },
  { id: "ande", patrones: [/caja de ande/] },
];

const DOMINIOS_OFICIALES = [
  "bncr.fi.cr",
  "bancobcr.com",
  "baccredomatic.com",
  "bac.net",
  "bancopopular.fi.cr",
  "davivienda.cr",
  "scotiabankcr.com",
  "promerica.fi.cr",
  "grupomutual.fi.cr",
  "bccr.fi.cr",
];

const ACORTADORES = [
  "bit.ly",
  "tinyurl.com",
  "t.co",
  "goo.gl",
  "cutt.ly",
  "is.gd",
  "rb.gy",
  "shorturl.at",
  "tiny.cc",
  "ow.ly",
  "buff.ly",
  "rebrand.ly",
];

const TLD_RAROS = new Set([
  "xyz",
  "top",
  "click",
  "ru",
  "tk",
  "ml",
  "gq",
  "cf",
  "buzz",
  "rest",
  "zip",
  "mov",
  "loan",
  "icu",
  "country",
  "cam",
]);

const REMITENTES_CONOCIDOS = new Set([
  "bncr",
  "bcr",
  "bac",
  "banconacional",
  "bancodecostarica",
  "bancopopular",
  "popular",
  "davivienda",
  "scotiabank",
  "scotia",
  "promerica",
  "grupomutual",
  "mutual",
  "cajadeande",
  "kolbi",
  "ice",
]);

function normalizar(texto: string): string {
  return sinTildes(texto).toLowerCase();
}

function compactarRemitente(valor: string): string {
  return normalizar(valor).replace(/[^a-z0-9]/g, "");
}

function armar(veredicto: VeredictoSms, razones: string[]): ResultadoSms {
  return {
    veredicto,
    color: COLOR[veredicto],
    titulo: TITULO[veredicto],
    explicacion: EXPLICACION[veredicto],
    razones,
    aviso: AVISO_SMS,
  };
}

function preparar(texto: string): { cuerpo: string; recortado: boolean } {
  const limpio = texto.trim();
  if (limpio.length <= LIMITE_TEXTO) return { cuerpo: limpio, recortado: false };
  return { cuerpo: limpio.slice(0, LIMITE_TEXTO), recortado: true };
}

function tieneMonto(texto: string): boolean {
  const n = normalizar(texto);
  if (/₡\s*\d/.test(texto)) return true;
  if (/\bcrc\s*\d/.test(n)) return true;
  if (/\d[\d.,]*\s*(crc|colones)\b/.test(n)) return true;
  if (/\b(monto|importe|total)\s*[:\-]?\s*(crc\s*)?\d/.test(n)) return true;
  return false;
}

function tieneReferencia(texto: string): boolean {
  const n = normalizar(texto);
  if (/\b(referencia|ref\.?|autorizacion)\b[^a-z0-9]{0,8}(?=[a-z0-9-]*\d)[a-z0-9-]{4,}/.test(n)) {
    return true;
  }
  return /\bcomprobante\b[^a-z0-9]{0,16}(?:no\.?|nro\.?|numero|#)?\s*[:\-]?\s*(?=[a-z0-9-]*\d)[a-z0-9-]{4,}/.test(
    n,
  );
}

function tieneFecha(texto: string): boolean {
  const n = normalizar(texto);
  if (/\b\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}\b/.test(n)) return true;
  return /\b\d{1,2}\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|setiembre|septiembre|octubre|noviembre|diciembre)\b/.test(
    n,
  );
}

function tieneHora(texto: string): boolean {
  const n = normalizar(texto);
  return /\b\d{1,2}:\d{2}\b/.test(n) || /\b\d{1,2}\s*(a\.?\s*m\.?|p\.?\s*m\.?)\b/.test(n);
}

function bancosEn(texto: string): string[] {
  const n = normalizar(texto);
  return BANCOS.filter((banco) => banco.patrones.some((patron) => patron.test(n))).map((banco) => banco.id);
}

function pareceComprobante(texto: string): boolean {
  const n = normalizar(texto);
  const banco = bancosEn(n).length > 0;
  const sinpe = /\bsinpe\b/.test(n);
  const movimiento = /\b(transferencia|comprobante|recibido|recibida|deposito|envio|enviado|enviada)\b/.test(n);
  return (banco || sinpe) && (sinpe || movimiento);
}

function hostDe(url: string): string {
  const compacto = url.replace(/^hxxp/i, "http").replace(/\s+/g, "").replace(/\[:\]/g, ":");
  const conProto = /^https?:\/\//i.test(compacto) ? compacto : `https://${compacto}`;
  try {
    return new URL(conProto).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    const sinRuta = compacto.replace(/^https?:\/\//i, "").split("/")[0] ?? compacto;
    return sinRuta.replace(/^www\./i, "").toLowerCase();
  }
}

function esDominioOficial(host: string): boolean {
  return DOMINIOS_OFICIALES.some((dominio) => host === dominio || host.endsWith(`.${dominio}`));
}

function esAcortador(host: string): boolean {
  return ACORTADORES.some((dominio) => host === dominio || host.endsWith(`.${dominio}`));
}

function pareceLookalike(host: string): boolean {
  if (esDominioOficial(host)) return false;
  return /bncr|banco[-.]?nacional|banconacional|sinpe|bancobcr|scotiabank|davivienda|promerica|baccredomatic/.test(
    host,
  );
}

type ClaseEnlace = "acortado" | "ip" | "ofuscado" | "lookalike" | "raro" | "oficial";

function clasificarEnlace(url: string, ofuscado: boolean): ClaseEnlace {
  if (ofuscado) return "ofuscado";
  const host = hostDe(url);
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) return "ip";
  if (esAcortador(host)) return "acortado";
  if (pareceLookalike(host)) return "lookalike";
  const tld = host.split(".").pop() ?? "";
  if (TLD_RAROS.has(tld)) return "raro";
  if (esDominioOficial(host)) return "oficial";
  return "raro";
}

function extraerEnlaces(texto: string): { url: string; clase: ClaseEnlace }[] {
  const vistos = new Set<string>();
  const salida: { url: string; clase: ClaseEnlace }[] = [];
  const sumar = (url: string, ofuscado: boolean) => {
    const clave = url.toLowerCase();
    if (vistos.has(clave)) return;
    vistos.add(clave);
    salida.push({ url, clase: clasificarEnlace(url, ofuscado) });
  };

  for (const url of texto.match(/https?:\/\/[^\s<>"']+/gi) ?? []) sumar(url, false);
  for (const url of texto.match(/\bwww\.[^\s<>"']+/gi) ?? []) sumar(url, false);
  for (const url of texto.match(/hxxps?:\/\/[^\s<>"']+/gi) ?? []) sumar(url, true);
  for (const dominio of ACORTADORES) {
    const patron = new RegExp(`\\b${dominio.replace(".", "\\.")}\\/[^\\s<>"']+`, "gi");
    for (const url of texto.match(patron) ?? []) sumar(url, false);
  }
  if (
    /(?:https?|hxxps?)\s+:\s*\/\s*\/|(?:https?|hxxps?)\[:\]\s*\/\s*\/|(?:https?|hxxps?):\s+\/\s*\/|www\s+\.\s*[a-z0-9-]+/i.test(
      texto,
    )
  ) {
    sumar("enlace-ofuscado", true);
  }
  return salida;
}

function hallazgoEnlace(enlaces: { clase: ClaseEnlace }[]): Hallazgo | null {
  if (enlaces.length === 0) return null;
  const clases = new Set(enlaces.map((enlace) => enlace.clase));
  if (clases.has("acortado")) {
    return {
      id: "enlace",
      nivel: "alta",
      razon: "Hay un enlace acortado. Eso esconde a dónde lleva y no viene en un comprobante de verdad.",
    };
  }
  if (clases.has("ip") || clases.has("ofuscado") || clases.has("lookalike") || clases.has("raro")) {
    return {
      id: "enlace",
      nivel: "alta",
      razon: "Hay un enlace raro. Un comprobante por SMS no te manda a confirmar en un sitio.",
    };
  }
  return {
    id: "enlace",
    nivel: "media",
    razon: "Hay un enlace a un sitio que parece de un banco. El SMS del comprobante casi nunca pide que entres a una página.",
  };
}

function parecePersona(valor: string): boolean {
  const limpio = valor.trim();
  if (!limpio || limpio.length > 80) return false;
  if (/[@+\d_\-]/.test(limpio)) return false;
  if (!/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ.' ]+$/.test(limpio)) return false;
  return limpio.split(/\s+/).every((palabra) => palabra.length >= 2);
}

function esRemitenteConocido(valor: string): boolean {
  return REMITENTES_CONOCIDOS.has(compactarRemitente(valor));
}

function clasificarRemitente(valor: string): Hallazgo | null {
  const limpio = valor.trim().replace(/[.,;]+$/, "");
  if (!limpio || esRemitenteConocido(limpio)) return null;
  if (/(alerta|premio|secure|verify|verificacion|soporte|ayuda|ganador|gratis|login|clave)/i.test(normalizar(limpio))) {
    return {
      id: "remitente_disfraz",
      nivel: "alta",
      razon: "El remitente usa palabras como alerta, premio o soporte. Eso es típico de un SMS falso.",
    };
  }
  if (parecePersona(limpio)) return null;
  if (/@/.test(limpio)) {
    return {
      id: "correo",
      nivel: "alta",
      razon: "El remitente parece un correo. El banco no manda el comprobante pidiendo que escribas a un email.",
    };
  }
  const compacto = limpio.replace(/[\s().-]/g, "");
  if (/^\+(?!506)\d{8,}$/.test(compacto) || /^00(?!506)\d{8,}$/.test(compacto)) {
    return {
      id: "telefono_extranjero",
      nivel: "alta",
      razon: "El remitente parece un número de otro país. Un SMS del banco en Costa Rica no llega así.",
    };
  }
  if (/^\+?506\d{8}$/.test(compacto) || /^[5678]\d{7}$/.test(compacto)) {
    return {
      id: "remitente_celular",
      nivel: "media",
      razon: "El remitente parece un celular personal. El banco suele identificarse con un nombre corto, no con un número de persona.",
    };
  }
  if (/\d/.test(limpio) && /[a-z]/i.test(limpio)) {
    return {
      id: "remitente_raro",
      nivel: "media",
      razon: "El remitente mezcla letras y números de una forma que no parece el nombre corto del banco.",
    };
  }
  return null;
}

function remitentesDe(texto: string): string[] {
  const encontrados: string[] = [];
  const patrones = [
    /(?:^|\n)\s*(?:remitente|from|sender|sms de|mensaje de|enviado por)\s*[:\-]?\s*([^\n]+)/gi,
    /(?:^|\n)\s*de\s*:\s*([^\n]+)/gi,
  ];
  for (const patron of patrones) {
    for (const coincidencia of texto.matchAll(patron)) {
      const valor = coincidencia[1]?.trim();
      if (valor) encontrados.push(valor);
    }
  }
  return encontrados;
}

function sinEnlaces(texto: string): string {
  return texto.replace(/https?:\/\/\S+|hxxps?:\/\/\S+|www\.\S+/gi, " ");
}

function revisar(texto: string, forma: boolean): Hallazgo[] {
  const hallazgos: Hallazgo[] = [];
  const n = normalizar(texto);

  if (/[\u0400-\u04FF]/.test(texto)) {
    hallazgos.push({
      id: "homoglifos",
      nivel: "alta",
      razon: "Hay letras que se ven normales pero no lo son. Así disfrazan el nombre del banco o un enlace.",
    });
  }

  const enlace = hallazgoEnlace(extraerEnlaces(texto));
  if (enlace) hallazgos.push(enlace);

  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(texto)) {
    hallazgos.push({
      id: "correo",
      nivel: "alta",
      razon: "Hay un correo electrónico. El comprobante por SMS no pide que escribas a un email.",
    });
  }

  if (
    /cuenta\s+(sera|quedara|esta|fue|ha sido)\s+(bloqueada|suspendida|cerrada|congelada|inhabilitada)/.test(n) ||
    /(bloquearemos|suspenderemos|cerraremos|congelaremos)\s+(tu|su)\s+cuenta/.test(n) ||
    /(ingrese|digite|escriba|envie|comparta)\s+(su|tu)\s+(clave|pin|contrasena|usuario|codigo)/.test(n) ||
    /(clave|pin|contrasena)\s+(dinamica|de un solo uso|temporal)/.test(n) ||
    /(gane|ganaste|ganador|premio|felicidades|reclama).{0,60}(premio|dinero|transferencia|bono)/.test(n) ||
    /ultima oportunidad/.test(n) ||
    /(confirme|verifique|actualice)\s+(su|tu)\s+(cuenta|identidad|datos|clave)/.test(n)
  ) {
    hallazgos.push({
      id: "amenaza",
      nivel: "alta",
      razon: "Presiona con la cuenta, una clave o un premio. Un comprobante de SINPE no pide eso.",
    });
  }

  if (
    /\b(devolveme|devolvemelo|devuelvame|devuelvamelo|devuelva|devolver|devolve|devolucion|reintegro|reembolso|me equivoque|numero equivocado|el vuelto)\b/.test(
      n,
    )
  ) {
    hallazgos.push({
      id: "devolucion",
      nivel: "alta",
      razon: "Pide una devolución o dice que se equivocó. Si el depósito no está en tu banco, devolver es regalar plata.",
    });
  }

  const bancos = bancosEn(n);
  if (bancos.length >= 2) {
    hallazgos.push({
      id: "varios_bancos",
      nivel: "alta",
      razon: "Menciona más de un banco. Un comprobante real suele venir de uno solo.",
    });
  }

  if (/banco nacional de (america|los estados unidos|mexico|espana|panama|colombia)/.test(n)) {
    hallazgos.push({
      id: "banco_ajeno",
      nivel: "alta",
      razon: "El nombre del banco no es el de Costa Rica. No cuadra con un SINPE Móvil.",
    });
  }

  if (/\b(paypal|western union|zelle|bitcoin|btc|usdt|binance|wise|skrill|ethereum)\b/.test(n)) {
    hallazgos.push({
      id: "servicio_ajeno",
      nivel: "alta",
      razon: "Mezcla el comprobante con PayPal, cripto u otro servicio que no es SINPE Móvil.",
    });
  }

  if (/\b(transferencia internacional|wire transfer|\bach\b|swift)\b/.test(n) && (bancos.length > 0 || /\bsinpe\b/.test(n))) {
    hallazgos.push({
      id: "internacional",
      nivel: "alta",
      razon: "Habla de una transferencia internacional o SWIFT junto con SINPE. Son cosas distintas.",
    });
  }

  const iban = n.match(/\biban\b[^a-z0-9]{0,6}([a-z]{2}\d{2}[a-z0-9]{8,})/);
  if (iban && iban[1] && !iban[1].startsWith("cr")) {
    hallazgos.push({
      id: "iban_ajeno",
      nivel: "alta",
      razon: "La cuenta no parece de Costa Rica. El IBAN de aquí empieza con CR.",
    });
  }

  if (/\bbanc0\b|\bb4nco\b|\bbanco0\b/.test(n)) {
    hallazgos.push({
      id: "typo_banco",
      nivel: "alta",
      razon: "El nombre del banco está escrito con números. Un SMS real no suele fallar así.",
    });
  }

  if (/\bnacionl\b|\bnacioanl\b|\bnaciona1\b|\bbanconacionl\b/.test(n)) {
    hallazgos.push({
      id: "typo_nacional",
      nivel: "alta",
      razon: "«Nacional» está mal escrito. Un SMS del Banco Nacional no suele venir así.",
    });
  }

  if (
    /\bsinpee\b|\bsinpeee\b|\bsimpe\b|\bs1npe\b|\bsinp3\b|\bmovill\b|\bmoviil\b|\bmobvil\b/.test(n) ||
    /sinpé|sínpe/i.test(texto) ||
    /\bcomprovante\b|\bconprobante\b/.test(n) ||
    /\btranferencia\b|\btrasferencia\b|\btransferensia\b/.test(n) ||
    /\breferensia\b|\breferncia\b/.test(n) ||
    /\bverifik\w*\b|\bverifike\b/.test(n)
  ) {
    hallazgos.push({
      id: "typo_phishing",
      nivel: "media",
      razon: "Hay un error de escritura que se ve mucho en mensajes falsos.",
    });
  }

  if (/\burgente\b|\burgencia\b|\binmediatamente\b|\bde inmediato\b|\bahora mismo\b|\bya mismo\b|\bapurate\b|\brapido\b|\bsin falta\b|\bhaga clic\b|\bhaz clic\b|\bclick here\b/.test(n)) {
    hallazgos.push({
      id: "apuro",
      nivel: "media",
      razon: "Apura para que actúes ya. Un comprobante no necesita esa prisa.",
    });
  }

  const cuerpoSinEnlaces = sinEnlaces(texto);
  if (/\+\s*(?!506\b)\d{1,3}[\s.-]?\d{2,}|\b00(?!506)\d{8,}/.test(cuerpoSinEnlaces)) {
    hallazgos.push({
      id: "telefono_extranjero",
      nivel: "alta",
      razon: "Aparece un teléfono de otro país. No es la forma en que escribe el banco de aquí.",
    });
  }

  for (const remitente of remitentesDe(texto)) {
    const hallazgo = clasificarRemitente(remitente);
    if (hallazgo && !hallazgos.some((existente) => existente.id === hallazgo.id)) {
      hallazgos.push(hallazgo);
    }
  }

  if (forma) {
    if (!pareceComprobante(texto)) {
      hallazgos.push({
        id: "no_parece_recibo",
        nivel: "media",
        razon: "No parece un comprobante de SINPE ni de un banco de Costa Rica.",
      });
    } else if (bancos.length === 1 && !/\bsinpe\b|\btransferencia\b|\bcomprobante\b|\bdeposito\b/.test(n)) {
      hallazgos.push({
        id: "banco_sin_recibo",
        nivel: "media",
        razon: "Nombra un banco, pero el texto no se lee como un comprobante de transferencia.",
      });
    }
  }

  return hallazgos;
}

function camposFaltantes(texto: string): Hallazgo[] {
  const faltan: Hallazgo[] = [];
  if (!tieneMonto(texto)) {
    faltan.push({
      id: "falta_monto",
      nivel: "media",
      razon: "No vimos un monto.",
    });
  }
  if (!tieneReferencia(texto)) {
    faltan.push({
      id: "falta_referencia",
      nivel: "media",
      razon: "No vimos una referencia o un número de comprobante.",
    });
  }
  if (!tieneFecha(texto) && !tieneHora(texto)) {
    faltan.push({
      id: "falta_fecha",
      nivel: "media",
      razon: "No vimos fecha ni hora.",
    });
  }
  return faltan;
}

function conNota(hallazgos: Hallazgo[]): Hallazgo[] {
  return hallazgos.map((hallazgo) => ({
    ...hallazgo,
    razon: `En la nota: ${hallazgo.razon.charAt(0).toLowerCase()}${hallazgo.razon.slice(1)}`,
  }));
}

function unir(mensaje: Hallazgo[], nota: Hallazgo[]): Hallazgo[] {
  const ids = new Set(mensaje.map((hallazgo) => hallazgo.id));
  return [...mensaje, ...conNota(nota).filter((hallazgo) => !ids.has(hallazgo.id))];
}

function razonesDe(hallazgos: Hallazgo[]): string[] {
  const ordenados = [...hallazgos].sort((a, b) => {
    if (a.nivel === b.nivel) return 0;
    return a.nivel === "alta" ? -1 : 1;
  });
  const razones: string[] = [];
  for (const hallazgo of ordenados) {
    if (razones.length >= TOPE_RAZONES) break;
    if (!razones.includes(hallazgo.razon)) razones.push(hallazgo.razon);
  }
  return razones;
}

/**
 * Revisa un SMS de comprobante en memoria. No guarda el texto ni consulta a un banco.
 * La nota es opcional y solo aporta contexto (por ejemplo, si pidieron una devolución).
 */
export function analizarSms(texto: string, nota = ""): ResultadoSms {
  const mensaje = preparar(texto);
  const comentario = preparar(nota);

  if (!mensaje.cuerpo && !comentario.cuerpo) {
    return armar("poco_claro", ["Pegá el SMS del comprobante para revisarlo."]);
  }
  if (!mensaje.cuerpo) {
    return armar("poco_claro", ["Falta el SMS. La nota no reemplaza el mensaje del banco."]);
  }

  const delMensaje = [...revisar(mensaje.cuerpo, true), ...camposFaltantes(mensaje.cuerpo)];
  if (mensaje.recortado) {
    delMensaje.push({
      id: "recorte",
      nivel: "media",
      razon: "El mensaje es muy largo. Revisamos solo el inicio.",
    });
  }
  const deLaNota = comentario.cuerpo ? revisar(comentario.cuerpo, false) : [];
  const hallazgos = unir(delMensaje, deLaNota);
  const hayAlta = hallazgos.some((hallazgo) => hallazgo.nivel === "alta");
  const hayMedia = hallazgos.some((hallazgo) => hallazgo.nivel === "media");

  if (hayAlta) return armar("sospechoso", razonesDe(hallazgos));
  if (hayMedia) return armar("poco_claro", razonesDe(hallazgos));

  return armar("se_ve_normal", [
    "Tiene monto, referencia y fecha u hora, como un comprobante de SINPE.",
    "El texto nombra un banco de Costa Rica o SINPE Móvil, sin mezclar otro.",
    "No vimos enlaces raros, apuros ni errores típicos de un mensaje falso.",
  ]);
}
