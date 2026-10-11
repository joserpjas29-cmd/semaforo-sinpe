"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Flag } from "lucide-react";
import { CampoTelefono, presentarEntrada } from "@/components/campo-telefono";
import { Encabezado } from "@/components/encabezado";
import { clsBoton, clsEnlace, clsFoco } from "@/components/estilos";
import { Recordatorio } from "@/components/recordatorio";
import { ResultadoRiesgo, type LineaResultado } from "@/components/resultado-riesgo";
import { SelloStellar } from "@/components/sello-stellar";
import { NUMEROS_DEMO } from "@/lib/ejemplos";
import { guardarHistorial } from "@/lib/historial-local";
import { interpretarRespuesta } from "@/lib/mensaje-limite";
import { formatearTelefono, normalizarTelefono } from "@/lib/telefono";
import { sellosParaMostrar, type SelloVisible } from "@/lib/sello-vista";
import { RECORDATORIO_ENVIO, type ResultadoNumero } from "@/lib/tipos";
import { cn } from "@/lib/utils";

interface Consulta extends ResultadoNumero {
  telefono: string;
  telefonoFormateado: string;
  esEjemplo: boolean;
  pareceCelular: boolean;
  recordatorio: string;
  sellos?: SelloVisible[];
}

const LLAMADO = {
  rojo: "Mejor no le envíes plata ni des un producto por pagado.",
  amarillo: "Andá con cuidado y verificá el nombre en tu banco antes de confirmar.",
  verde: "Verde no es permiso para transferir. Confirmá en tu banco.",
} as const;

const PUNTO = {
  rojo: "bg-riesgo-rojo",
  amarillo: "bg-riesgo-amarillo",
  verde: "bg-riesgo-verde",
} as const;

function lineasDe(resultado: Consulta): LineaResultado[] {
  const lineas: LineaResultado[] = [];
  if (resultado.conteo.total > 0) {
    const cantidad = resultado.conteo.total;
    lineas.push({
      id: "total",
      titulo: resultado.esEjemplo
        ? cantidad === 1
          ? "En la demo hay 1 reporte ficticio."
          : `En la demo hay ${cantidad} reportes ficticios.`
        : cantidad === 1
          ? "Reportado 1 vez por la comunidad."
          : `Reportado ${cantidad} veces por la comunidad.`,
    });
  }
  resultado.razones.forEach((razon, indice) => {
    lineas.push({ id: `razon-${indice}`, titulo: razon });
  });
  return lineas;
}

export function ConsultarForm({ numeroInicial = "" }: { numeroInicial?: string }) {
  const normalizadoInicial = normalizarTelefono(numeroInicial);
  const [telefono, setTelefono] = useState(
    normalizadoInicial ? formatearTelefono(normalizadoInicial) : presentarEntrada(numeroInicial),
  );
  const [resultado, setResultado] = useState<Consulta | null>(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (numeroInicial.trim()) {
      void consultar(numeroInicial);
    }
    // La consulta inicial solo corre al abrir la página con ?numero=
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function consultar(valor: string) {
    setCargando(true);
    setError("");
    setResultado(null);
    try {
      const respuesta = await fetch("/api/consultar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telefono: valor }),
      });
      const leido = await interpretarRespuesta<Consulta>(respuesta, "No se pudo consultar.");
      if (!leido.ok) {
        setError(leido.error);
        return;
      }
      setResultado(leido.datos);
      setTelefono(leido.datos.telefonoFormateado);
      guardarHistorial({
        tipo: "numero",
        color: leido.datos.color,
        titulo: leido.datos.titulo,
        telefono: leido.datos.telefono,
        puntaje: leido.datos.puntaje,
      });
    } catch {
      setError("No hay conexión con la herramienta. Probá de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-5xl flex-1 flex-col lg:min-h-0">
      <Encabezado titulo="Consultar número" texto="Ingresá el número a verificar." />

      <form
        className="mt-6 flex flex-1 flex-col lg:grid lg:flex-none lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start lg:gap-8"
        aria-busy={cargando || undefined}
        onSubmit={(evento) => {
          evento.preventDefault();
          void consultar(telefono);
        }}
      >
        <div>
          <label htmlFor="telefono" className="sr-only">
            Número de celular
          </label>
          <CampoTelefono
            id="telefono"
            value={telefono}
            onChange={setTelefono}
            descritoPor={error ? "error-telefono" : "ayuda-telefono"}
            invalido={Boolean(error)}
          />
          <p id="ayuda-telefono" className="mt-2 text-sm text-muted-foreground">
            8 dígitos. Si lo pegás con +506, también sirve.
          </p>
          {error && (
            <p id="error-telefono" role="alert" className="mt-2 text-sm font-medium text-destructive">
              {error}
            </p>
          )}

          <p className="mt-6 text-sm text-muted-foreground">Modo demo (datos de ejemplo)</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {NUMEROS_DEMO.map((numero) => (
              <li key={numero.telefono}>
                <button
                  type="button"
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border border-border bg-card py-1.5 pr-3 pl-2.5 text-sm font-medium text-foreground",
                    clsFoco,
                  )}
                  aria-label={`${formatearTelefono(numero.telefono)}. ${numero.nota}`}
                  onClick={() => {
                    setTelefono(formatearTelefono(numero.telefono));
                    void consultar(numero.telefono);
                  }}
                >
                  <span className={cn("size-2 rounded-full", PUNTO[numero.color])} aria-hidden />
                  {formatearTelefono(numero.telefono)}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-auto space-y-3 pt-8 lg:mt-0 lg:pt-0">
          <Recordatorio texto={RECORDATORIO_ENVIO} titulo="Verificá el nombre en tu banco" />
          <button type="submit" disabled={cargando} className={clsBoton}>
            {cargando ? "Consultando…" : "Verificar"}
          </button>
        </div>
      </form>

      {resultado && (
        <ResultadoRiesgo
          color={resultado.color}
          titulo={resultado.titulo}
          explicacion={resultado.explicacion}
          telefono={resultado.telefonoFormateado}
          esEjemplo={resultado.esEjemplo}
          indice={resultado.puntaje}
          lineas={lineasDe(resultado)}
          banner={LLAMADO[resultado.color]}
          nota={resultado.recordatorio}
          avisoExtra={
            resultado.pareceCelular
              ? undefined
              : "Este número no parece celular. SINPE Móvil suele usar uno que empieza con 5, 6, 7 u 8."
          }
          extra={
            sellosParaMostrar(resultado.sellos).length > 0 ? (
              <SelloStellar sellos={resultado.sellos ?? []} />
            ) : undefined
          }
          onCerrar={() => setResultado(null)}
          acciones={
            <>
              <Link href={`/reportar?numero=${resultado.telefono}`} className={clsBoton}>
                <Flag className="size-4" aria-hidden />
                Reportar este número
              </Link>
              <Link href="/" className={clsEnlace}>
                Volver al inicio
              </Link>
            </>
          }
        />
      )}
    </div>
  );
}
