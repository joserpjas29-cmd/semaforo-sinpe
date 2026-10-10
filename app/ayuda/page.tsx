import type { Metadata } from "next";
import { AyudaContenido } from "@/components/ayuda-contenido";
import { obtenerEstadisticas } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ayuda",
  description: "Cómo funciona el semáforo de Stopfy, de dónde salen los reportes y qué datos se guardan.",
};

export default async function PaginaAyuda() {
  const datos = await obtenerEstadisticas();
  return <AyudaContenido datos={datos} />;
}
