import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const salida = path.join(process.cwd(), "public", "ejemplos");

function escapar(texto) {
  return texto
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function recibo({ titulo, lineas, acento }) {
  const ancho = 1080;
  const alto = 340 + lineas.length * 128 + 100;
  const filas = lineas
    .map((linea, indice) => {
      const y = 290 + indice * 128;
      return `
        <text x="88" y="${y}" font-family="Noto Sans, sans-serif" font-size="28" fill="#6a6258">${escapar(linea.etiqueta)}</text>
        <text x="88" y="${y + 52}" font-family="Noto Sans, sans-serif" font-size="46" font-weight="700" fill="#1c1915">${escapar(linea.valor)}</text>
        <line x1="88" y1="${y + 74}" x2="992" y2="${y + 74}" stroke="#efe8dc" stroke-width="2"/>
      `;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${alto}" viewBox="0 0 ${ancho} ${alto}">
  <rect width="100%" height="100%" fill="#efeae2"/>
  <rect x="36" y="36" width="${ancho - 72}" height="${alto - 72}" rx="40" fill="#fffdf9"/>
  <rect x="36" y="36" width="${ancho - 72}" height="168" rx="40" fill="${acento}"/>
  <rect x="36" y="150" width="${ancho - 72}" height="54" fill="${acento}"/>
  <text x="88" y="140" font-family="Noto Sans, sans-serif" font-size="42" font-weight="700" fill="#fffdf9">${escapar(titulo)}</text>
  ${filas}
</svg>`;
}

const imagenes = [
  {
    archivo: "comprobante-legitimo.png",
    svg: recibo({
      titulo: "COMPROBANTE SINPE MOVIL",
      acento: "#123f3a",
      lineas: [
        { etiqueta: "Tipo", valor: "SINPE MOVIL" },
        { etiqueta: "Banco", valor: "Banco Nacional" },
        { etiqueta: "Fecha", valor: "01/10/2026" },
        { etiqueta: "Hora", valor: "14:32" },
        { etiqueta: "Monto", valor: "CRC 15.000,00" },
        { etiqueta: "Referencia", valor: "4829173650" },
        { etiqueta: "De", valor: "Maria Solis Quiros" },
        { etiqueta: "Para", valor: "Jose Vargas Mora" },
      ],
    }),
  },
  {
    archivo: "comprobante-precaucion.png",
    svg: recibo({
      titulo: "DETALLE DE TRANSFERENCIA",
      acento: "#3d4a55",
      lineas: [
        { etiqueta: "Banco", valor: "Banco Popular" },
        { etiqueta: "Fecha", valor: "28/09/2026" },
        { etiqueta: "Hora", valor: "09:15" },
        { etiqueta: "Monto", valor: "CRC 8.500,00" },
        { etiqueta: "Referencia", valor: "9081726354" },
        { etiqueta: "De", valor: "Laura Chen Wu" },
        { etiqueta: "Para", valor: "Taller El Roble" },
      ],
    }),
  },
  {
    archivo: "comprobante-sospechoso.png",
    svg: recibo({
      titulo: "COMPROBANTE SINPE MOVIL",
      acento: "#7a2e28",
      lineas: [
        { etiqueta: "Tipo", valor: "SINPE MOVIL" },
        { etiqueta: "Banco", valor: "Banco Nacional" },
        { etiqueta: "Entidad", valor: "BAC Credomatic" },
        { etiqueta: "Fecha", valor: "31/02/2026" },
        { etiqueta: "Hora", valor: "25:99" },
        { etiqueta: "Monto", valor: "CRC 25.OOO,00" },
        { etiqueta: "Total", valor: "CRC 2.500,00" },
        { etiqueta: "Referencia", valor: "12" },
        { etiqueta: "De", valor: "Cliente Apurado" },
        { etiqueta: "Para", valor: "Tienda La Esquina" },
      ],
    }),
  },
];

await mkdir(salida, { recursive: true });

for (const imagen of imagenes) {
  const destino = path.join(salida, imagen.archivo);
  await sharp(Buffer.from(imagen.svg)).png().toFile(destino);
  console.log("listo", destino);
}
