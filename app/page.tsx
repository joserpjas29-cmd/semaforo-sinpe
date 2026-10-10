import type { Metadata } from "next";
import { Inicio } from "@/components/inicio";

export const metadata: Metadata = {
  title: { absolute: "Stopfy" },
  description:
    "Detectá estafas de SINPE Móvil antes de transferir. Consultá un número, un comprobante o un SMS, y reportá.",
};

export default function PaginaInicio() {
  return <Inicio />;
}
