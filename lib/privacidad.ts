import { createHmac } from "node:crypto";

/** Los reportes se borran solos pasados 6 meses (los de demostración no). */
export const RETENCION_DIAS = 180;

const DEV_PEPPER = "semaforo-sinpe-dev-pepper";
const DEV_SAL = "semaforo-sinpe-dev-sal";

function esProduccion(): boolean {
  return process.env.NODE_ENV === "production";
}

function esMarcador(valor: string): boolean {
  return valor.length < 16 || valor.toLowerCase().startsWith("cambia");
}

/**
 * Clave que mezcla el hash de los teléfonos. En producción es obligatoria: con una
 * clave conocida, cualquiera con una copia de la base recorre los 100 millones de
 * números posibles en segundos y recupera los teléfonos.
 */
function pimienta(): string {
  const valor = process.env.TELEFONO_PEPPER?.trim() ?? "";
  if (!esProduccion()) return valor || DEV_PEPPER;
  if (!valor || esMarcador(valor)) {
    throw new Error(
      "Falta TELEFONO_PEPPER (16 caracteres o más, distinta del ejemplo). " +
        "Generá una con: openssl rand -hex 32. No la cambies después: los reportes guardados dejarían de coincidir.",
    );
  }
  return valor;
}

let avisoSal = false;

function sal(): string {
  const valor = process.env.RATE_LIMIT_SALT?.trim() ?? "";
  if (!esProduccion()) return valor || DEV_SAL;
  if (!valor || esMarcador(valor)) {
    if (!avisoSal) {
      avisoSal = true;
      console.warn("RATE_LIMIT_SALT falta o es la del ejemplo. Poné una frase larga y propia en producción.");
    }
    return valor || DEV_SAL;
  }
  return valor;
}

/** Falla temprano, con un mensaje claro, si en producción falta la clave de los teléfonos. */
export function validarSecretos(): void {
  pimienta();
}

/** HMAC-SHA256 del número ya normalizado. La base guarda esto y nunca el número. */
export function hashTelefono(telefono: string): string {
  return createHmac("sha256", pimienta()).update(`tel:${telefono}`).digest("hex");
}

/** La IP tampoco se guarda en claro: solo este hash, y solo mientras dura la ventana del límite. */
export function hashIp(ip: string): string {
  return createHmac("sha256", sal()).update(`ip:${ip}`).digest("hex");
}
