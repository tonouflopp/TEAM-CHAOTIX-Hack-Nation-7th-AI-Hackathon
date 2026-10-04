import type { TimelineItem } from "../lib/api";
import { clock } from "../lib/format";
import { EyeOffIcon, QuestionIcon, ScreenIcon } from "./Icons";

// Línea de tiempo cronológica: eventos de pantalla, preguntas del agente con su evento, respuestas y huecos.
export function Timeline({ items, live = false }: { items: TimelineItem[]; live?: boolean }) {
  if (items.length === 0)
    return (
      <p className="rounded-card border border-dashed border-line px-5 py-8 text-center text-sm text-slate-600">
        {live
          ? "Work as you normally would. Screen steps and the apprentice's questions will appear here."
          : "This session has no recorded steps or conversation."}
      </p>
    );

  return (
    <ol className="space-y-2.5" aria-live={live ? "polite" : undefined}>
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <time className="w-12 shrink-0 pt-2.5 text-right text-xs tabular-nums text-slate-500">{clock(item.t)}</time>
          <div className="min-w-0 flex-1">
            <Row item={item} />
          </div>
        </li>
      ))}
    </ol>
  );
}

function Row({ item }: { item: TimelineItem }) {
  if (item.kind === "gap")
    return (
      <div className="flex items-center gap-2 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-600">
        <EyeOffIcon className="size-4" />
        Off the record {item.until === null ? "(in progress)" : `until ${clock(item.until)}`}. Not analyzed.
      </div>
    );

  if (item.kind === "screen")
    return (
      <div className="flex items-start gap-2 rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-line">
        <ScreenIcon className="mt-0.5 size-4 shrink-0 text-slate-500" />
        <span>
          {item.summary}
          {item.field && (
            <span className="mt-0.5 block text-xs text-slate-600">
              {item.field}: {item.from ?? "—"} → {item.to ?? "—"}
            </span>
          )}
        </span>
      </div>
    );

  if (item.role === "agent")
    return (
      <div className={`rounded-xl px-3 py-2 text-sm ${item.isQuestion ? "bg-accent-tint text-slate-900" : "bg-paper text-slate-700"}`}>
        <span className="flex items-start gap-2">
          {item.isQuestion && <QuestionIcon className="mt-0.5 size-4 shrink-0 text-accent" />}
          <span>
            <span className="font-medium text-accent-strong">Apprentice{item.isQuestion ? " asked" : ""}: </span>
            {item.text}
          </span>
        </span>
        {item.isQuestion && item.aboutEvent && (
          <span className="mt-1 block pl-6 text-xs text-slate-600">About: {item.aboutEvent}</span>
        )}
      </div>
    );

  return (
    <div className="rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-line">
      <span className="font-medium text-slate-900">Expert: </span>
      {item.text}
    </div>
  );
}
