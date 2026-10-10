import type { Metadata } from "next";
import { HistorialLista } from "@/components/historial-lista";

export const metadata: Metadata = {
  title: "Historial",
  description: "Tus últimas consultas en este navegador. Stopfy no guarda esta lista en el servidor.",
};

export default function PaginaHistorial() {
  return <HistorialLista />;
}
