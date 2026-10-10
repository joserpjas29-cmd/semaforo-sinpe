import Link from "next/link";
import { clsEnlace } from "@/components/estilos";

export default function NoEncontrada() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-4 py-16">
      <p className="text-sm font-semibold text-link">404</p>
      <h1 className="text-[28px] font-extrabold tracking-tight text-foreground">Esa página no está</h1>
      <p className="text-[15px] text-muted-foreground">El enlace no lleva a ninguna parte de Stopfy.</p>
      <Link href="/" className={clsEnlace}>
        Volver al inicio
      </Link>
    </div>
  );
}
