import { afterEach, describe, expect, it, vi } from "vitest";
import { hashIp, hashTelefono, validarSecretos } from "../lib/privacidad";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("hash de teléfonos", () => {
  it("es estable, hexadecimal y no contiene el número", () => {
    const hash = hashTelefono("60603030");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).toBe(hashTelefono("60603030"));
    expect(hash).not.toContain("60603030");
    expect(hashTelefono("60603031")).not.toBe(hash);
  });

  it("cambia si cambia la clave secreta", () => {
    const antes = hashTelefono("60603030");
    vi.stubEnv("TELEFONO_PEPPER", "otra-clave-bien-larga-de-prueba");
    expect(hashTelefono("60603030")).not.toBe(antes);
  });

  it("no mezcla el hash de un teléfono con el de una IP", () => {
    expect(hashIp("60603030")).not.toBe(hashTelefono("60603030"));
  });
});

describe("claves en producción", () => {
  it("falla sin TELEFONO_PEPPER, con una corta o con la del ejemplo", () => {
    vi.stubEnv("NODE_ENV", "production");

    vi.stubEnv("TELEFONO_PEPPER", "");
    expect(() => validarSecretos()).toThrow(/TELEFONO_PEPPER/);
    expect(() => hashTelefono("60603030")).toThrow(/TELEFONO_PEPPER/);

    vi.stubEnv("TELEFONO_PEPPER", "corta");
    expect(() => validarSecretos()).toThrow(/TELEFONO_PEPPER/);

    vi.stubEnv("TELEFONO_PEPPER", "cambia-esto-en-produccion-por-favor");
    expect(() => validarSecretos()).toThrow(/TELEFONO_PEPPER/);
  });

  it("funciona con una clave propia", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TELEFONO_PEPPER", "una-clave-propia-de-treinta-y-dos-caracteres");
    expect(() => validarSecretos()).not.toThrow();
    expect(hashTelefono("60603030")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("sin RATE_LIMIT_SALT avisa pero no tumba la app", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RATE_LIMIT_SALT", "");
    const aviso = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(hashIp("203.0.113.9")).toMatch(/^[0-9a-f]{64}$/);
    aviso.mockRestore();
  });
});
