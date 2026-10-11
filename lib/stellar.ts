import { createHash } from "node:crypto";
import { txEsSello, urlExplorador, type SelloVisible } from "./sello-vista";

/** Solo la red de pruebas. Cualquier otro valor se ignora para no tocar la red pública. */
export const RED_PRUEBA = "testnet";

const HORIZON_TESTNET = "https://horizon-testnet.stellar.org";
const NOMBRE_DATO = "stopfy";
const TOPE_MS = 20_000;

export interface DatosSello {
  /** HMAC-SHA256 del teléfono, nunca el número. */
  telefonoHash: string;
  id: number;
  creadoEn: string;
}

/**
 * Texto que se hashea. Lleva el HMAC, el id y la hora.
 * No lleva el teléfono ni la descripción (ahí puede haber datos personales).
 */
export function preimagenAnonima(entrada: DatosSello): string {
  return `stopfy:v1:${entrada.telefonoHash}:${entrada.id}:${entrada.creadoEn}`;
}

/** SHA-256 de 32 bytes. Cabe en un memo hash y en un ManageData. */
export function hashAnonimoReporte(entrada: DatosSello): Uint8Array {
  return createHash("sha256").update(preimagenAnonima(entrada), "utf8").digest();
}

/**
 * La cuenta firmante solo existe si las dos variables están y la red es testnet.
 * Una clave con forma rara se ignora: el reporte sigue sin sello.
 */
export function configuracionStellar(): { secret: string } | null {
  const secret = process.env.STELLAR_SECRET_KEY?.trim() ?? "";
  const red = (process.env.STELLAR_NETWORK ?? "").trim().toLowerCase();
  if (red !== RED_PRUEBA) return null;
  if (!/^S[A-Z2-7]{55}$/.test(secret)) return null;
  return { secret };
}

function datosSellables(entrada: DatosSello): boolean {
  return /^[0-9a-f]{64}$/.test(entrada.telefonoHash) && Number.isInteger(entrada.id) && entrada.id > 0 && entrada.creadoEn.length > 0;
}

function secuenciaMala(error: unknown): boolean {
  if (error && typeof error === "object" && "getResultCodes" in error) {
    const leer = (error as { getResultCodes: () => { transaction?: string } }).getResultCodes;
    if (typeof leer === "function") {
      try {
        if (leer.call(error).transaction === "tx_bad_seq") return true;
      } catch {
        // El error no trae códigos de resultado.
      }
    }
  }
  return error instanceof Error && error.message.includes("tx_bad_seq");
}

function conTope<T>(promesa: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Stellar tardó demasiado")), ms);
    promesa.then(
      (valor) => {
        clearTimeout(timer);
        resolve(valor);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

async function enviarSello(secret: string, hash: Uint8Array): Promise<SelloVisible> {
  const sdk = await import("@stellar/stellar-sdk");
  const par = sdk.Keypair.fromSecret(secret);
  const servidor = new sdk.Horizon.Server(HORIZON_TESTNET);
  let ultimo: unknown;
  for (let intento = 0; intento < 2; intento += 1) {
    try {
      const cuenta = await servidor.loadAccount(par.publicKey());
      const tx = new sdk.TransactionBuilder(cuenta, {
        fee: sdk.BASE_FEE,
        networkPassphrase: sdk.Networks.TESTNET,
      })
        .addOperation(sdk.Operation.manageData({ name: NOMBRE_DATO, value: hash }))
        .addMemo(sdk.Memo.hash(hash))
        .setTimeout(180)
        .build();
      tx.sign(par);
      const enviado = await servidor.submitTransaction(tx);
      const id = typeof enviado.hash === "string" ? enviado.hash.toLowerCase() : "";
      if (!txEsSello(id)) throw new Error("Horizon no devolvió un hash de transacción.");
      return { tx: id, url: urlExplorador(id) };
    } catch (error) {
      ultimo = error;
      if (intento === 0 && secuenciaMala(error)) continue;
      throw error;
    }
  }
  throw ultimo instanceof Error ? ultimo : new Error("No se pudo sellar el reporte.");
}

/**
 * Publica el hash en la testnet. Si no hay cuenta, la clave no sirve o la red falla,
 * devuelve null: el reporte ya está guardado y la app sigue.
 * El runner de pruebas (Vitest) nunca llama a la red.
 */
export async function sellarReporte(entrada: DatosSello): Promise<SelloVisible | null> {
  const config = configuracionStellar();
  if (!config || !datosSellables(entrada)) return null;
  if (process.env.VITEST) return null;
  try {
    return await conTope(enviarSello(config.secret, hashAnonimoReporte(entrada)), TOPE_MS);
  } catch (error) {
    const detalle = error instanceof Error ? error.message : "error desconocido";
    console.error(`No se pudo sellar el reporte en la red de pruebas de Stellar. El reporte igual quedó guardado. ${detalle}`);
    return null;
  }
}
