import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import { Barra, Pie } from "@/components/barra";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Semáforo SINPE",
    template: "%s · Semáforo SINPE",
  },
  description:
    "Consultá un número, analizá un comprobante y reportá estafas de SINPE Móvil en Costa Rica. Antes de soltar la plata, mirá el semáforo.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-CR" className={`${outfit.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="min-h-full">
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-card focus:px-3 focus:py-2"
        >
          Saltar al contenido
        </a>
        <div className="flex min-h-full flex-col pb-16 md:pb-0">
          <Barra />
          <main id="contenido" className="flex-1">
            {children}
          </main>
          <Pie />
        </div>
      </body>
    </html>
  );
}
