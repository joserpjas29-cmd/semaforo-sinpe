import { describe, expect, it } from "vitest";
import { analizarSms, AVISO_SMS, EJEMPLOS_SMS, PRIVACIDAD_SMS } from "../lib/sms";

const RECIBO = `BNCR: SINPE Movil recibido
De: MARIA SOLIS QUIROS
Monto: CRC 15.000,00
Fecha: 02/10/2026 14:32
Referencia: 4829173650`;

function razones(texto: string, nota = ""): string {
  return analizarSms(texto, nota).razones.join(" ");
}

describe("revisión de SMS", () => {
  it("marca como normal un comprobante con monto, referencia y fecha", () => {
    const resultado = analizarSms(RECIBO);
    expect(resultado.veredicto).toBe("se_ve_normal");
    expect(resultado.color).toBe("verde");
    expect(resultado.titulo).toBe("Se ve normal");
    expect(resultado.razones.length).toBeGreaterThan(0);
    expect(resultado.aviso).toBe(AVISO_SMS);
    expect(resultado.aviso).toMatch(/no se conecta a ningún banco/i);
    expect(resultado.aviso).toMatch(/no puede probar/i);
    expect(`${resultado.aviso} ${resultado.explicacion} ${resultado.razones.join(" ")}`).not.toMatch(/banca/i);
  });

  it("acepta Banco Nacional de Costa Rica y un SMS de BAC en una línea", () => {
    expect(
      analizarSms(`Banco Nacional de Costa Rica
SINPE Movil recibido
Monto: CRC 8.500,00
02/10/2026 09:10
Referencia: 1122334455`).veredicto,
    ).toBe("se_ve_normal");

    expect(
      analizarSms("BAC: SINPE Movil recibido ₡25.000,00 de JOSE VARGAS. Ref 12345678. 05/10/2026 14:32").veredicto,
    ).toBe("se_ve_normal");
  });

  it("no trata el nombre de quien envió la plata como un remitente raro", () => {
    const resultado = analizarSms(RECIBO);
    expect(resultado.razones.join(" ")).not.toMatch(/remitente/i);
  });

  it("acepta el nombre corto del banco como remitente", () => {
    const resultado = analizarSms(`Remitente: BNCR
SINPE Movil recibido
Monto: CRC 8.500,00
Fecha: 02/10/2026 09:15
Referencia: 889912345`);
    expect(resultado.veredicto).toBe("se_ve_normal");
  });

  it("deja en poco claro un texto vacío o solo una nota", () => {
    expect(analizarSms("   ").veredicto).toBe("poco_claro");
    expect(analizarSms("   ").color).not.toBe("verde");
    expect(analizarSms("", "me escribió por WhatsApp").veredicto).toBe("poco_claro");
    expect(analizarSms("").razones[0]).toMatch(/Pegá el SMS/i);
  });

  it("señala los campos típicos que faltan", () => {
    const resultado = analizarSms("Banco Nacional\nRecibiste una transferencia.\nGracias por preferirnos.");
    expect(resultado.veredicto).toBe("poco_claro");
    expect(resultado.color).toBe("amarillo");
    const texto = resultado.razones.join(" ");
    expect(texto).toMatch(/monto/i);
    expect(texto).toMatch(/referencia/i);
    expect(texto).toMatch(/fecha/i);
  });

  it("marca un enlace acortado y el apuro", () => {
    const resultado = analizarSms(`${RECIBO}\nUrgente: confirme en https://bit.ly/bncr-pago`);
    expect(resultado.veredicto).toBe("sospechoso");
    expect(resultado.color).toBe("rojo");
    expect(razones(`${RECIBO}\nUrgente: confirme en https://bit.ly/bncr-pago`)).toMatch(/enlace acortado/i);
    expect(razones(`${RECIBO}\nUrgente: confirme en bit.ly/bncr-pago`)).toMatch(/apuro|prisa/i);
  });

  it("marca un enlace que se hace pasar por el banco y uno oficial como poco claro", () => {
    expect(analizarSms(`${RECIBO}\nhttp://bncr-seguro.xyz/login`).veredicto).toBe("sospechoso");
    expect(razones(`${RECIBO}\nhttp://192.168.0.8/pago`)).toMatch(/enlace raro/i);
    expect(razones(`${RECIBO}\nhxxp://banco-nacional.top/clave`)).toMatch(/enlace raro/i);
    expect(razones(`${RECIBO}\nEntrá en https : //bncr-seguro.xyz/login`)).toMatch(/enlace raro/i);

    const oficial = analizarSms(`${RECIBO}\nDetalle: https://www.bncr.fi.cr/personas`);
    expect(oficial.veredicto).toBe("poco_claro");
    expect(oficial.color).not.toBe("rojo");
    expect(oficial.razones.join(" ")).toMatch(/enlace/i);
  });

  it("marca bancos que no cuadran, otro país y servicios ajenos", () => {
    expect(analizarSms(`${RECIBO}\nTambién BAC Credomatic`).veredicto).toBe("sospechoso");
    expect(razones(`${RECIBO}\nTambién BAC Credomatic`)).toMatch(/más de un banco/i);
    expect(analizarSms("SINPE Movil por PayPal. Monto CRC 10.000,00. Ref 12345678. 02/10/2026 10:00").veredicto).toBe(
      "sospechoso",
    );
    expect(
      analizarSms("Banco Nacional de México: SINPE recibido. Monto CRC 10.000,00. Ref 12345678. 02/10/2026").veredicto,
    ).toBe("sospechoso");
    expect(
      razones("SINPE Movil. IBAN ES9121000418450200051332. Monto CRC 9.000,00. Ref 12345678. 02/10/2026 11:00"),
    ).toMatch(/IBAN/i);
    expect(analizarSms(`${RECIBO}\nTransferencia internacional SWIFT`).veredicto).toBe("sospechoso");
  });

  it("marca errores de escritura típicos de phishing", () => {
    const leve = analizarSms(RECIBO.replace("SINPE", "SINPEE"));
    expect(leve.veredicto).toBe("poco_claro");
    expect(leve.razones.join(" ")).toMatch(/error de escritura/i);

    const grave = analizarSms(RECIBO.replace("BNCR", "Banco Nacionl"));
    expect(grave.veredicto).toBe("sospechoso");
    expect(grave.razones.join(" ")).toMatch(/Nacional/i);

    expect(analizarSms(RECIBO.replace("BNCR", "Banc0 Nacional")).veredicto).toBe("sospechoso");
    expect(analizarSms(RECIBO.replace("Movil", "Movill")).veredicto).toBe("poco_claro");
  });

  it("marca remitentes raros y no un celular de Costa Rica en el cuerpo del SINPE", () => {
    expect(analizarSms(`Remitente: +1 305 555 0199\n${RECIBO}`).veredicto).toBe("sospechoso");
    expect(analizarSms(`Remitente: soporte@bncr-seguro.xyz\n${RECIBO}`).veredicto).toBe("sospechoso");
    expect(analizarSms(`Remitente: BNCR-ALERTA\n${RECIBO}`).veredicto).toBe("sospechoso");
    expect(analizarSms(`Remitente: BNCR ALERTA\n${RECIBO}`).veredicto).toBe("sospechoso");

    const personal = analizarSms(`Remitente: +506 8888 1212\n${RECIBO}`);
    expect(personal.veredicto).toBe("poco_claro");
    expect(personal.razones.join(" ")).toMatch(/celular personal/i);

    expect(analizarSms(`${RECIBO}\nCelular: 88881212`).veredicto).toBe("se_ve_normal");
  });

  it("usa la nota para el guion de la devolución sin guardar el SMS", () => {
    const resultado = analizarSms(RECIBO, "Me equivoqué, devuélvame la plata ya.");
    expect(resultado.veredicto).toBe("sospechoso");
    expect(resultado.razones.some((razon) => /en la nota/i.test(razon) && /devol/i.test(razon))).toBe(true);
    expect(PRIVACIDAD_SMS).toMatch(/no se envían/i);
    expect(PRIVACIDAD_SMS).toMatch(/ni se guardan/i);
    expect(PRIVACIDAD_SMS).not.toMatch(/banca/i);
  });

  it("marca letras disfrazadas y un mensaje que presiona la cuenta", () => {
    const disfraz = analizarSms(RECIBO.replace("BNCR", "Banco Naci\u043Enal"));
    expect(disfraz.veredicto).toBe("sospechoso");
    expect(disfraz.razones.join(" ")).toMatch(/letras/i);

    const bloqueo = analizarSms(
      "Banco Nacional: su cuenta sera bloqueada. Ingrese su clave. Monto CRC 1.000,00. Ref 12345678. 02/10/2026 08:00",
    );
    expect(bloqueo.veredicto).toBe("sospechoso");
    expect(bloqueo.razones.join(" ")).toMatch(/clave|cuenta|premio/i);
  });

  it("los ejemplos de la pantalla caen en el color que prometen", () => {
    expect(EJEMPLOS_SMS.length).toBeGreaterThanOrEqual(5);
    expect(EJEMPLOS_SMS.length).toBeLessThanOrEqual(6);

    const etiquetas = EJEMPLOS_SMS.map((ejemplo) => ejemplo.etiqueta.toLowerCase()).join(" ");
    expect(etiquetas).toMatch(/verde/);
    expect(etiquetas).toMatch(/amarillo/);
    expect(etiquetas).toMatch(/rojo/);

    const textos = EJEMPLOS_SMS.map((ejemplo) => `${ejemplo.etiqueta}\n${ejemplo.texto}`).join("\n");
    expect(textos).toMatch(/banco nacional|bncr/i);
    expect(textos).toMatch(/\bbcr\b|banco de costa rica/i);
    expect(textos).toMatch(/\bbac\b/i);
    expect(textos).not.toMatch(/banca/i);

    const verdes = EJEMPLOS_SMS.filter((ejemplo) => ejemplo.veredicto === "se_ve_normal");
    expect(verdes.length).toBeGreaterThanOrEqual(2);
    expect(verdes.every((ejemplo) => !/https?:\/\//i.test(ejemplo.texto))).toBe(true);
    expect(EJEMPLOS_SMS.some((ejemplo) => ejemplo.veredicto === "poco_claro")).toBe(true);
    expect(EJEMPLOS_SMS.some((ejemplo) => ejemplo.veredicto === "sospechoso")).toBe(true);

    for (const ejemplo of EJEMPLOS_SMS) {
      const resultado = analizarSms(ejemplo.texto, ejemplo.nota ?? "");
      expect(resultado.veredicto).toBe(ejemplo.veredicto);
      expect(resultado.color).toBe(
        ejemplo.veredicto === "se_ve_normal" ? "verde" : ejemplo.veredicto === "poco_claro" ? "amarillo" : "rojo",
      );
      expect(`${ejemplo.etiqueta} ${ejemplo.texto} ${resultado.explicacion}`).not.toMatch(/banca/i);
    }
  });

  it("no afirma una verificación oficial", () => {
    const resultado = analizarSms(RECIBO);
    const texto = `${resultado.titulo} ${resultado.explicacion} ${resultado.aviso} ${resultado.razones.join(" ")}`;
    expect(texto).not.toMatch(/verificad[oa] por el banco|oficialmente real|comprobante auténtico/i);
    expect(resultado.explicacion).toMatch(/banco/i);
  });
});
