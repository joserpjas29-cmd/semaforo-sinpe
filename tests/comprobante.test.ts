import { describe, expect, it } from "vitest";
import { analizarComprobante, parsearNumero } from "../lib/comprobante";

const ahora = new Date(2026, 9, 2, 15, 0, 0);

function armar(opciones: {
  sinpe?: string;
  bancos?: string;
  fecha?: string;
  hora?: string;
  monto?: string;
  referencia?: string;
} = {}): string {
  return `
${opciones.sinpe ?? "COMPROBANTE\nSINPE MOVIL"}
${opciones.bancos ?? "Banco Nacional"}
Fecha: ${opciones.fecha ?? "01/10/2026"}
Hora: ${opciones.hora ?? "14:32"}
Monto: ${opciones.monto ?? "CRC 15.000,00"}
Referencia: ${opciones.referencia ?? "4829173650"}
De: Maria Solis Quiros
Para: Jose Vargas Mora
`.trim();
}

function ids(texto: string, mensaje = "", extra: Parameters<typeof analizarComprobante>[2] = {}) {
  return analizarComprobante(texto, mensaje, { ahora, ...extra }).senales.map((senal) => senal.id);
}

describe("lectura de montos", () => {
  it("entiende el formato de colones de Costa Rica", () => {
    expect(parsearNumero("15.000,00")).toBe(15000);
    expect(parsearNumero("15.000")).toBe(15000);
    expect(parsearNumero("2.500,00")).toBe(2500);
    expect(parsearNumero("15000.00")).toBe(15000);
    expect(parsearNumero("8.500")).toBe(8500);
  });
});

describe("heurísticas del comprobante", () => {
  it("da verde a un comprobante consistente", () => {
    const resultado = analizarComprobante(armar(), "Listo, ya le hice el SINPE del encargo.", { ahora });
    expect(resultado.color).toBe("verde");
    expect(resultado.senales).toEqual([]);
    expect(resultado.datos.monto).toBe(15000);
    expect(resultado.datos.referencia).toBe("4829173650");
    expect(resultado.datos.bancos).toEqual(["Banco Nacional"]);
    expect(resultado.datos.nombreOrigen).toMatch(/Maria Solis/i);
    expect(resultado.datos.nombreDestino).toMatch(/Jose Vargas/i);
    expect(resultado.datos.fechaTexto).toBe("01/10/2026");
    expect(resultado.datos.horaTexto).toBe("14:32");
    expect(resultado.recordatorio).toMatch(/banco/i);
  });

  it("no trata un texto vacío como luz verde", () => {
    const resultado = analizarComprobante("   ", "", { ahora });
    expect(resultado.color).not.toBe("verde");
    expect(resultado.color).toBe("amarillo");
    expect(ids("   ")).toContain("lectura_insuficiente");
  });

  it("marca una fecha que no existe", () => {
    const resultado = analizarComprobante(armar({ fecha: "31/02/2026" }), "", { ahora });
    expect(resultado.color).toBe("rojo");
    expect(resultado.senales.some((senal) => senal.id === "fecha_imposible")).toBe(true);
    expect(resultado.senales.find((senal) => senal.id === "fecha_imposible")?.detalle).toMatch(/31\/02\/2026/);
  });

  it("marca una hora imposible", () => {
    expect(ids(armar({ hora: "25:99" }))).toContain("fecha_imposible");
    expect(analizarComprobante(armar({ hora: "25:99" }), "", { ahora }).color).toBe("rojo");
  });

  it("marca una fecha futura", () => {
    expect(ids(armar({ fecha: "15/12/2026" }))).toContain("fecha_imposible");
  });

  it("marca una hora de hoy que todavía no llega", () => {
    const mananaTemprano = new Date(2026, 9, 2, 10, 0, 0);
    const resultado = analizarComprobante(armar({ fecha: "02/10/2026", hora: "18:40" }), "", {
      ahora: mananaTemprano,
    });
    expect(resultado.senales.map((senal) => senal.id)).toContain("fecha_imposible");
  });

  it("marca un comprobante anterior a SINPE Móvil", () => {
    expect(ids(armar({ fecha: "01/01/2010" }))).toContain("fecha_imposible");
  });

  it("marca una referencia corta o de relleno", () => {
    expect(ids(armar({ referencia: "12" }))).toContain("referencia_invalida");
    expect(ids(armar({ referencia: "111111" }))).toContain("referencia_invalida");
    expect(ids(armar({ referencia: "123456" }))).toContain("referencia_invalida");
  });

  it("marca dos montos distintos en el mismo comprobante", () => {
    const resultado = analizarComprobante(
      armar({ monto: "CRC 25.000,00\nTotal: CRC 2.500,00" }),
      "",
      { ahora },
    );
    expect(resultado.datos.montos).toEqual([25000, 2500]);
    expect(resultado.senales.map((senal) => senal.id)).toContain("monto_no_cuadra");
    expect(resultado.color).toBe("rojo");
  });

  it("marca cuando el mensaje habla de otro monto", () => {
    const resultado = analizarComprobante(armar(), "Te deposité 20 mil, revisá porfa.", { ahora });
    expect(resultado.senales.map((senal) => senal.id)).toContain("monto_no_cuadra");
  });

  it("no marca si el mensaje dice el mismo monto en palabras", () => {
    const resultado = analizarComprobante(armar(), "Listo, ahí van los 15 mil.", { ahora });
    expect(resultado.color).toBe("verde");
  });

  it("marca dos bancos en el mismo texto", () => {
    const resultado = analizarComprobante(
      armar({ bancos: "Banco Nacional\nBAC Credomatic" }),
      "",
      { ahora },
    );
    expect(resultado.datos.bancos).toEqual(["Banco Nacional", "BAC"]);
    expect(resultado.senales.find((senal) => senal.id === "formato_inconsistente")?.severidad).toBe("alta");
  });

  it("pone amarillo si hay un banco pero el texto no dice SINPE", () => {
    const resultado = analizarComprobante(
      armar({
        sinpe: "Detalle de transferencia",
        bancos: "Banco Popular",
        monto: "CRC 8.500,00",
        referencia: "9081726354",
        fecha: "28/09/2026",
      }),
      "",
      { ahora },
    );
    expect(resultado.color).toBe("amarillo");
    expect(resultado.senales.map((senal) => senal.id)).toEqual(["formato_inconsistente"]);
  });

  it("detecta el guion de devolver la plata con urgencia", () => {
    const mensaje = "Mae me equivoqué de número, por favor devuélvame la plata ya mismo que es urgente.";
    const resultado = analizarComprobante(armar(), mensaje, { ahora });
    expect(resultado.color).toBe("rojo");
    const encontradas = resultado.senales.map((senal) => senal.id);
    expect(encontradas).toEqual(
      expect.arrayContaining(["guion_equivocacion", "guion_devolucion", "guion_urgencia"]),
    );
  });

  it("marca edición cuando el monto se lee mucho peor que el resto", () => {
    const resultado = analizarComprobante(armar(), "", {
      ahora,
      confianzaGlobal: 90,
      palabras: [
        { texto: "Monto", confianza: 96 },
        { texto: "15.000,00", confianza: 28 },
        { texto: "Referencia", confianza: 95 },
        { texto: "4829173650", confianza: 97 },
        { texto: "Banco", confianza: 94 },
        { texto: "Nacional", confianza: 93 },
      ],
    });
    expect(resultado.senales.map((senal) => senal.id)).toContain("edicion_evidente");
    expect(resultado.color).toBe("rojo");
  });

  it("no marca edición si todo el texto se lee con la misma confianza", () => {
    const resultado = analizarComprobante(armar(), "", {
      ahora,
      confianzaGlobal: 92,
      palabras: [
        { texto: "15.000,00", confianza: 94 },
        { texto: "4829173650", confianza: 96 },
        { texto: "Nacional", confianza: 93 },
      ],
    });
    expect(resultado.senales.map((senal) => senal.id)).not.toContain("edicion_evidente");
    expect(resultado.color).toBe("verde");
  });

  it("no confunde la o de la palabra monto con un monto en cero", () => {
    const texto = "Monto\n\nCRC 15.000,00\nReferencia\n4829173650";
    const resultado = analizarComprobante(
      `COMPROBANTE\nSINPE MOVIL\nBanco Nacional\nFecha: 01/10/2026\nHora: 14:32\n${texto}\nDe: Maria Solis\nPara: Jose Vargas`,
      "",
      { ahora },
    );
    expect(resultado.datos.montos).toEqual([15000]);
    expect(resultado.color).toBe("verde");
  });

  it("marca un monto escrito con letras en lugar de ceros", () => {
    const resultado = analizarComprobante(armar({ monto: "CRC 25.OOO,00" }), "", { ahora });
    expect(resultado.datos.monto).toBe(25000);
    expect(resultado.senales.map((senal) => senal.id)).toContain("edicion_evidente");
  });
});
