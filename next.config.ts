import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["tesseract.js", "tesseract.js-core", "wasm-feature-detect"],
  // El worker de tesseract se abre por ruta, así que el trazado de Next no lo
  // sigue solo. Sin estos archivos el OCR falla en la función de Vercel.
  outputFileTracingIncludes: {
    "/api/analizar": [
      "./tessdata/**/*",
      "./node_modules/tesseract.js/**/*",
      "./node_modules/tesseract.js-core/**/*",
      "./node_modules/wasm-feature-detect/**/*",
      "./node_modules/bmp-js/**/*",
      "./node_modules/is-url/**/*",
      "./node_modules/regenerator-runtime/**/*",
    ],
  },
  agentRules: false,
  // En dev, el canal de depuración de React deja la hidratación colgada
  // cuando el documento parece servido desde caché (sin IndexedDB). Sin esto
  // los formularios no reciben listeners y el navegador hace un GET nativo.
  experimental: {
    reactDebugChannel: false,
  },
  // El servidor escucha en 0.0.0.0; el navegador entra por 127.0.0.1.
  // Sin esto, Next bloquea el websocket de HMR en desarrollo.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
