import { TriangleAlert } from "lucide-react";

export function Recordatorio({ texto, titulo = "No te saltes este paso" }: { texto: string; titulo?: string }) {
  return (
    <aside className="flex gap-3 rounded-2xl bg-[#fff6e4] px-4 py-3 text-[#3f2e10] ring-1 ring-[#e4c98a]">
      <TriangleAlert className="mt-0.5 size-5 shrink-0 text-[#8a5a00]" aria-hidden />
      <div className="space-y-1 text-sm leading-relaxed">
        <p className="font-semibold">{titulo}</p>
        <p>{texto}</p>
      </div>
    </aside>
  );
}
