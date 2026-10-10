import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { BarraLateral, Navegacion } from "@/components/navegacion";
import { AplicarTema, SelectorTema } from "@/components/tema";
import { SCRIPT_TEMA } from "@/lib/tema-script";
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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F8FAFC" },
    { media: "(prefers-color-scheme: dark)", color: "#0F172A" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-CR" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body className="min-h-full bg-canvas text-foreground">
        <AplicarTema />
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-card focus:px-3 focus:py-2"
        >
          Saltar al contenido
        </a>
        <div className="flex h-dvh max-h-dvh bg-canvas">
          <BarraLateral />
          <div className="relative flex min-w-0 flex-1 flex-col bg-background">
            <div className="border-b border-border px-4 py-2 lg:hidden">
              <SelectorTema />
            </div>
            <main
              id="contenido"
              className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col overflow-y-auto px-5 pt-4 pb-28 lg:px-10 lg:pt-8 lg:pb-10"
            >
              {children}
            </main>
            <Navegacion />
          </div>
        </div>
      </body>
    </html>
  );
}
