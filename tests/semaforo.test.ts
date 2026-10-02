import { describe, expect, it } from "vitest";
import { NUMEROS_DEMO, REPORTES_EJEMPLO } from "../lib/ejemplos";
import { puntuarNumero, UMBRAL_AMARILLO, UMBRAL_ROJO } from "../lib/semaforo";
import type { ReporteParaPuntaje, TipoReporte } from "../lib/tipos";

const ahora = new Date(2026, 9, 2, 15, 0, 0);

function hace(dias: number): Date {
  return new Date(ahora.getTime() - dias * 86_400_000);
}

function reporte(tipo: TipoReporte, dias: number): ReporteParaPuntaje {
  return { tipo, creadoEn: hace(dias) };
}

describe("puntaje del semáforo", () => {
  it("deja en verde un número sin reportes", () => {
    const resultado = puntuarNumero([], ahora);
    expect(resultado.color).toBe("verde");
    expect(resultado.puntaje).toBe(0);
    expect(resultado.razones[0]).toMatch(/nadie ha reportado/i);
  });

  it("no alarma por un reporte viejo de poca gravedad", () => {
    const resultado = puntuarNumero([reporte("otro", 400)], ahora);
    expect(resultado.color).toBe("verde");
    expect(resultado.puntaje).toBeLessThan(UMBRAL_AMARILLO);
  });

  it("pone amarillo cuando hay avisos recientes pero no un patrón grave", () => {
    const resultado = puntuarNumero(
      [reporte("pidio_devolucion", 12), reporte("otro", 6)],
      ahora,
    );
    expect(resultado.color).toBe("amarillo");
    expect(resultado.puntaje).toBeGreaterThanOrEqual(UMBRAL_AMARILLO);
    expect(resultado.puntaje).toBeLessThan(UMBRAL_ROJO);
  });

  it("pone rojo con reportes graves recientes", () => {
    const resultado = puntuarNumero(
      [
        reporte("comprobante_falso", 2),
        reporte("numero_reciclado", 5),
        reporte("pidio_devolucion", 9),
      ],
      ahora,
    );
    expect(resultado.color).toBe("rojo");
    expect(resultado.puntaje).toBeGreaterThanOrEqual(UMBRAL_ROJO);
    expect(resultado.conteo.ultimos30).toBe(3);
    expect(resultado.conteo.porTipo.comprobante_falso).toBe(1);
  });

  it("enciende rojo por dos reportes graves en 30 días aunque el puntaje quede debajo del umbral", () => {
    const resultado = puntuarNumero(
      [reporte("numero_reciclado", 30), reporte("numero_reciclado", 30)],
      ahora,
    );
    expect(resultado.puntaje).toBeLessThan(UMBRAL_ROJO);
    expect(resultado.color).toBe("rojo");
    expect(resultado.razones.some((razon) => razon.includes("Regla directa"))).toBe(true);
  });

  it("no aplica esa regla si los reportes graves ya tienen más de 30 días", () => {
    const resultado = puntuarNumero(
      [reporte("numero_reciclado", 31), reporte("numero_reciclado", 31)],
      ahora,
    );
    expect(resultado.color).not.toBe("rojo");
  });

  it("un comprobante falso reciente nunca queda en verde", () => {
    const resultado = puntuarNumero([reporte("comprobante_falso", 3)], ahora);
    expect(resultado.color).not.toBe("verde");
  });

  it("los números de la demo caen en el color anunciado", () => {
    for (const demo of NUMEROS_DEMO) {
      const reportes = REPORTES_EJEMPLO.filter((reporteEjemplo) => reporteEjemplo.telefono === demo.telefono).map(
        (reporteEjemplo) => ({
          tipo: reporteEjemplo.tipo,
          creadoEn: new Date(ahora.getTime() - reporteEjemplo.diasAtras * 86_400_000),
        }),
      );
      expect(puntuarNumero(reportes, ahora).color, demo.telefono).toBe(demo.color);
    }
  });
});
