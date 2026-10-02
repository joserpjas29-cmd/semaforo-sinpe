import Link from "next/link";

export default function NoEncontrada() {
  return (
    <div className="mx-auto flex min-h-[50vh] w-full max-w-lg flex-col items-start justify-center gap-4 px-4 py-16">
      <p className="text-sm font-semibold tracking-[0.14em] text-primary uppercase">404</p>
      <h1 className="font-heading text-4xl">Esa página no está</h1>
      <p className="text-muted-foreground">El enlace no lleva a ninguna parte de Semáforo SINPE.</p>
      <Link href="/" className="font-medium text-primary underline-offset-4 hover:underline">
        Volver al inicio
      </Link>
    </div>
  );
}
