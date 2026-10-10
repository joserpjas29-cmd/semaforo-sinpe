import type { Metadata } from "next";
import { ComprobanteForm } from "@/components/comprobante-form";

export const metadata: Metadata = {
  title: "Comprobante",
  description: "Subí una captura de SINPE Móvil y revisá señales de un comprobante falso. Confirmá el depósito en tu banco.",
};

export default function PaginaComprobante() {
  return <ComprobanteForm />;
}
