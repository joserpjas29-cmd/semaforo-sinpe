/** Oscuro si la persona lo eligió, o si sigue al sistema y el sistema está en oscuro. «claro» nunca sigue al sistema. */
export function temaEsOscuro(guardado: string | null, prefiereOscuro: boolean): boolean {
  return guardado === "oscuro" || (guardado !== "claro" && prefiereOscuro);
}

/** Corre en el head, antes de pintar, para no parpadear al cargar el tema. */
export const SCRIPT_TEMA = `(function(){try{var t=localStorage.getItem("stopfy-tema");var o=t==="oscuro"||(t!=="claro"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",!!o);}catch(e){}})();`;
