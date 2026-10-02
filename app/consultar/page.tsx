import type { Metadata } from "next";
import { ConsultarForm } from "@/components/consultar-form";

export const metadata: Metadata = {
  title: "Consultar número",
  description: "Consultá un celular de Costa Rica antes de enviar un SINPE Móvil.",
};

export default async function PaginaConsultar({
  searchParams,
}: {
  searchParams: Promise<{ numero?: string }>;
}) {
  const { numero } = await searchParams;
  return <ConsultarForm numeroInicial={typeof numero === "string" ? numero : ""} />;
}
