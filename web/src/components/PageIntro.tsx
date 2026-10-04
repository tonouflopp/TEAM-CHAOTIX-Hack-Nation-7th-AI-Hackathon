import type { ReactNode } from "react";
import { VoiceWave } from "./VoiceWave";

// Título de la pestaña a la izquierda con la onda compacta justo debajo.
export function PageIntro({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">{title}</h1>
      <VoiceWave size="compact" className="-ml-1 mt-3" />
      {children}
    </div>
  );
}
