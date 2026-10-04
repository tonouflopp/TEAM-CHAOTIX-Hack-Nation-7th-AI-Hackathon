import { useState } from "react";
import { clock } from "../lib/format";
import type { WorkMap, WorkStep } from "../lib/workMap";
import { ChevronIcon, EyeOffIcon, ShieldIcon } from "./Icons";

// Work Map: secuencia de pasos (numerados porque es un proceso), cada uno con
// las razones y los guardrails que dio el experto. Cada paso se expande al hacer clic.
export function WorkMapView({ map }: { map: WorkMap }) {
  const steps = map.nodes.filter((n): n is WorkStep => n.kind === "step");
  const [openId, setOpenId] = useState<string | null>(steps.find((s) => s.questions.length)?.id ?? null);

  if (steps.length === 0)
    return (
      <p className="rounded-card border border-dashed border-line px-5 py-8 text-center text-sm text-slate-600">
        No steps were detected in this session yet. Steps appear when something changes on screen.
      </p>
    );

  const numbers = new Map(steps.filter((s) => s.id !== "intro").map((s, i) => [s.id, i + 1]));
  return (
    <ol className="relative">
      {map.nodes.map((node, i) => {
        const last = i === map.nodes.length - 1;
        if (node.kind === "gap")
          return (
            <li key={`gap-${i}`} className="relative flex gap-4 pb-4">
              <Rail last={last} dashed />
              <span className="w-8 shrink-0" aria-hidden />
              <div className="flex items-center gap-2 py-1.5 text-sm text-slate-600">
                <EyeOffIcon className="size-4" />
                Off the record from {clock(node.t)}
                {node.until !== null && <> to {clock(node.until)}</>}
              </div>
            </li>
          );

        const open = openId === node.id;
        const guardrails = node.questions.filter((q) => q.isGuardrail);
        const reasons = node.questions.filter((q) => !q.isGuardrail);
        return (
          <li key={node.id} className="relative flex gap-4 pb-4">
            <Rail last={last} />
            <span
              aria-hidden
              className={`relative z-10 grid size-8 shrink-0 place-items-center rounded-full text-xs font-semibold ${
                node.isDecision ? "rotate-45 rounded-md bg-midnight text-white" : "bg-white text-midnight ring-2 ring-midnight"
              }`}
            >
              <span className={node.isDecision ? "-rotate-45" : ""}>{numbers.get(node.id) ?? "·"}</span>
            </span>

            <div className="min-w-0 flex-1">
              <button
                onClick={() => setOpenId(open ? null : node.id)}
                aria-expanded={open}
                className="group flex w-full items-start gap-3 rounded-xl px-3 py-1.5 text-left transition-colors duration-150 hover:bg-white"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-slate-900">{node.title}</span>
                  <span className="mt-0.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
                    <span className="tabular-nums">{clock(node.t)}</span>
                    {node.isDecision && <span className="font-medium text-midnight">Decision</span>}
                    {reasons.length > 0 && <span>{reasons.length === 1 ? "1 reason" : `${reasons.length} reasons`}</span>}
                    {guardrails.length > 0 && (
                      <span className="font-medium text-guard">
                        {guardrails.length === 1 ? "1 guardrail" : `${guardrails.length} guardrails`}
                      </span>
                    )}
                  </span>
                </span>
                <ChevronIcon
                  className={`mt-0.5 size-4 shrink-0 text-slate-400 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
                />
              </button>

              {open && (
                <div className="mt-2 space-y-2.5 pl-3">
                  {node.change && <p className="text-sm text-slate-700">{node.change}</p>}
                  {node.questions.map((q, k) => (
                    <div
                      key={k}
                      className={`rounded-xl p-3 text-sm ${q.isGuardrail ? "bg-guard-tint ring-1 ring-amber-300" : "bg-white ring-1 ring-line"}`}
                    >
                      <p className="flex items-start gap-2 text-slate-700">
                        {q.isGuardrail && <ShieldIcon className="mt-0.5 size-4 shrink-0 text-guard" />}
                        <span>
                          <span className={`font-medium ${q.isGuardrail ? "text-guard" : "text-accent-strong"}`}>
                            {q.isGuardrail ? "Guardrail" : "Why"}:{" "}
                          </span>
                          {q.question}
                        </span>
                      </p>
                      <p className="mt-1.5 text-slate-900">{q.answer ?? <span className="text-slate-500">No answer recorded.</span>}</p>
                    </div>
                  ))}
                  {node.notes.map((note, k) => (
                    <p key={k} className="border-l-2 border-line pl-3 text-sm text-slate-700">
                      {note}
                    </p>
                  ))}
                  {!node.change && node.questions.length === 0 && node.notes.length === 0 && (
                    <p className="text-sm text-slate-600">No reasons captured for this step yet.</p>
                  )}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function Rail({ last, dashed = false }: { last: boolean; dashed?: boolean }) {
  if (last) return null;
  return (
    <span
      aria-hidden
      className={`absolute bottom-0 left-4 top-8 -ml-px w-0 border-l-2 ${dashed ? "border-dashed border-slate-300" : "border-slate-300"}`}
    />
  );
}
