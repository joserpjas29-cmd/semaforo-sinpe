export function Recordatorio({ texto, titulo = "No te saltes este paso" }: { texto: string; titulo?: string }) {
  return (
    <aside className="rounded-[16px] border border-border bg-card px-4 py-3 text-sm leading-relaxed">
      <p className="font-semibold text-foreground">{titulo}</p>
      <p className="mt-1 text-muted-foreground">{texto}</p>
    </aside>
  );
}
