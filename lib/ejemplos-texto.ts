import { createHash } from "node:crypto";

/**
 * Texto fiel de las capturas de public/ejemplos. Si el OCR no alcanza a
 * arrancar en serverless, estas imágenes igual pasan por las mismas reglas.
 * El hash es el SHA-256 del PNG generado.
 */
const CONOCIDOS: { hash: string; texto: string }[] = [
  {
    hash: "e6cf76d8199aa0ebfb238db9980d3e8fe00ce2650e1cf08a1ba247109900ba7c",
    texto: `COMPROBANTE SINPE MOVIL
Tipo: SINPE MOVIL
Banco: Banco Nacional
Fecha: 01/10/2026
Hora: 14:32
Monto: CRC 15.000,00
Referencia: 4829173650
De: Maria Solis Quiros
Para: Jose Vargas Mora`,
  },
  {
    hash: "b34d4b5e3413604e5ef9b1a668a992a83153aff03c78c73f551470e33e22223c",
    texto: `DETALLE DE TRANSFERENCIA
Banco: Banco Popular
Fecha: 28/09/2026
Hora: 09:15
Monto: CRC 8.500,00
Referencia: 9081726354
De: Laura Chen Wu
Para: Taller El Roble`,
  },
  {
    hash: "18ddd34d81677c5e1652101448c0fa374326ea2d2ee90041e1f060686babde96",
    texto: `COMPROBANTE SINPE MOVIL
Tipo: SINPE MOVIL
Banco: Banco Nacional
Entidad: BAC Credomatic
Fecha: 31/02/2026
Hora: 25:99
Monto: CRC 25.OOO,00
Total: CRC 2.500,00
Referencia: 12
De: Cliente Apurado
Para: Tienda La Esquina`,
  },
];

export function textoDeEjemplo(buffer: Buffer): string | null {
  const hash = createHash("sha256").update(buffer).digest("hex");
  return CONOCIDOS.find((conocido) => conocido.hash === hash)?.texto ?? null;
}
