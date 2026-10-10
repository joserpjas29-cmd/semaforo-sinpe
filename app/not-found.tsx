import Link from "next/link";
import { clsEnlace } from "@/components/estilos";

export default function NoEncontrada() {
  return (
    <div className="flex flex-1 flex-col justify-center gap-4 py-16">
      <p className="text-sm font-semibold text-[#1D4ED8]">404</p>
      <h1 className="text-[28px] font-extrabold tracking-tight text-[#0F172A]">Esa página no está</h1>
      <p className="text-[15px] text-[#64748B]">El enlace no lleva a ninguna parte de Stopfy.</p>
      <Link href="/" className={clsEnlace}>
        Volver al inicio
      </Link>
    </div>
  );
}
