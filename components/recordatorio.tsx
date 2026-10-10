export function Recordatorio({ texto, titulo = "No te saltes este paso" }: { texto: string; titulo?: string }) {
  return (
    <aside className="rounded-[16px] border border-[#E2E8F0] bg-white px-4 py-3 text-sm leading-relaxed">
      <p className="font-semibold text-[#0F172A]">{titulo}</p>
      <p className="mt-1 text-[#64748B]">{texto}</p>
    </aside>
  );
}
