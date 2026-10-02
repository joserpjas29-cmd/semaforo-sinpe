import type { Metadata } from "next";
import { ComprobanteForm } from "@/components/comprobante-form";

export const metadata: Metadata = {
  title: "Analizar comprobante",
  description: "Subí una captura de SINPE Móvil y revisá señales de un comprobante falso.",
};

export default function PaginaComprobante() {
  return <ComprobanteForm />;
}
