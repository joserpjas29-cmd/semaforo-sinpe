import { describe, expect, it } from "vitest";
import { SCRIPT_TEMA, temaEsOscuro } from "../lib/tema-script";

describe("tema", () => {
  it("sigue al sistema si no hay elección o si la elección es sistema", () => {
    expect(temaEsOscuro(null, true)).toBe(true);
    expect(temaEsOscuro(null, false)).toBe(false);
    expect(temaEsOscuro("sistema", true)).toBe(true);
    expect(temaEsOscuro("sistema", false)).toBe(false);
  });

  it("respeta claro y oscuro aunque el sistema diga otra cosa", () => {
    expect(temaEsOscuro("claro", true)).toBe(false);
    expect(temaEsOscuro("oscuro", false)).toBe(true);
  });

  it("el script del head usa la misma regla y la clave stopfy-tema", () => {
    expect(SCRIPT_TEMA).toContain('localStorage.getItem("stopfy-tema")');
    expect(SCRIPT_TEMA).toContain('t==="oscuro"||(t!=="claro"&&window.matchMedia("(prefers-color-scheme: dark)").matches)');
    expect(SCRIPT_TEMA).toContain('classList.toggle("dark"');
  });
});
