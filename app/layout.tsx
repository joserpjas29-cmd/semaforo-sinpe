import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Navegacion } from "@/components/navegacion";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Stopfy",
    template: "%s · Stopfy",
  },
  description:
    "Detectá estafas de SINPE Móvil antes de transferir. Stopfy nació como Semáforo SINPE: consultá un número, un comprobante o un SMS, y reportá. No reemplaza a tu banco.",
};

export const viewport: Viewport = {
  themeColor: "#F8FAFC",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-CR" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full bg-[#F8FAFC] text-[#0F172A] md:bg-[#E7EDF5]">
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2"
        >
          Saltar al contenido
        </a>
        <div className="relative mx-auto flex h-dvh max-h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-[#F8FAFC] md:my-6 md:h-[calc(100dvh-3rem)] md:rounded-[32px] md:shadow-[0_24px_60px_rgb(15_23_42_/_0.08)] md:ring-1 md:ring-[#E2E8F0]">
          <main id="contenido" className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pt-5 pb-24">
            {children}
          </main>
          <Navegacion />
        </div>
      </body>
    </html>
  );
}
