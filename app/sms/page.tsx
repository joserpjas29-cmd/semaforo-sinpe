import type { Metadata } from "next";
import { SmsForm } from "@/components/sms-form";

export const metadata: Metadata = {
  title: "Revisar un SMS",
  description:
    "Pegá un SMS de comprobante y revisá señales de estafa. No se conecta a tu banco ni guarda el mensaje.",
};

export default function PaginaSms() {
  return <SmsForm />;
}
