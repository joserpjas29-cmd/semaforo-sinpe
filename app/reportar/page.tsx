import type { Metadata } from "next";
import { ReportarForm } from "@/components/reportar-form";

export const metadata: Metadata = {
  title: "Reportar número",
  description: "Reportá un número ligado a un comprobante falso, un número reciclado o una devolución.",
};

export default async function PaginaReportar({
  searchParams,
}: {
  searchParams: Promise<{ numero?: string }>;
}) {
  const { numero } = await searchParams;
  return <ReportarForm numeroInicial={typeof numero === "string" ? numero : ""} />;
}
