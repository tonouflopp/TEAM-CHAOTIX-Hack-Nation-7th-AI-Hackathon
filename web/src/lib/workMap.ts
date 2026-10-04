import type { TimelineItem } from "./api";

// Work Map provisional construido a partir de la línea de tiempo de la sesión.
// Fase 2 (Map) lo sustituirá por un análisis con IA; ver generateWorkMap() en placeholders.ts.

export type QA = { question: string; answer: string | null; t: number; isGuardrail: boolean };

export type WorkStep = {
  kind: "step";
  id: string;
  t: number;
  title: string;
  type: string;
  change: string | null; // "Estado: Pendiente → Aprobada"
  isDecision: boolean;
  questions: QA[];
  notes: string[]; // lo que el experto dijo sin que se lo preguntaran
};

export type WorkGap = { kind: "gap"; t: number; until: number | null };

export type WorkMap = { nodes: (WorkStep | WorkGap)[]; guardrailCount: number; reasonCount: number };

const DECISION_TYPES = new Set(["approve", "reject", "select", "submit"]);
const GUARDRAIL_RE =
  /\b(nunca|jam[aá]s|siempre que|s[oó]lo si|solo si|excepci|l[ií]mite|m[aá]ximo|m[ií]nimo|parar[ií]a|par[oa]\b|escal|consult|no se puede|no deber|cu[aá]ndo no|firma de|never|only if|unless|limit|threshold|escalat|stop and|check with|sign-off|exception)/i;

export function buildWorkMap(items: TimelineItem[]): WorkMap {
  const nodes: (WorkStep | WorkGap)[] = [];
  const steps: WorkStep[] = [];
  let openQuestion: QA | null = null;

  const stepFor = (summary?: string | null) =>
    (summary && steps.findLast((s) => s.title === summary)) || steps.at(-1) || null;

  for (const item of [...items].sort((a, b) => a.t - b.t)) {
    if (item.kind === "gap") {
      nodes.push({ kind: "gap", t: item.t, until: item.until });
      continue;
    }
    if (item.kind === "screen") {
      const step: WorkStep = {
        kind: "step",
        id: `${item.t}-${steps.length}`,
        t: item.t,
        title: item.summary,
        type: item.type,
        change: item.field ? `${item.field}: ${item.from ?? "—"} → ${item.to ?? "—"}` : null,
        isDecision: DECISION_TYPES.has(item.type),
        questions: [],
        notes: [],
      };
      steps.push(step);
      nodes.push(step);
      continue;
    }
    // Transcripción
    if (item.role === "agent") {
      if (!item.isQuestion) continue;
      openQuestion = { question: item.text, answer: null, t: item.t, isGuardrail: GUARDRAIL_RE.test(item.text) };
      const step = stepFor(item.aboutEvent) ?? ensureIntroStep(nodes, steps);
      step.questions.push(openQuestion);
    } else if (openQuestion && !openQuestion.answer) {
      openQuestion.answer = item.text;
      openQuestion.isGuardrail ||= GUARDRAIL_RE.test(item.text);
      openQuestion = null;
    } else {
      (stepFor() ?? ensureIntroStep(nodes, steps)).notes.push(item.text);
    }
  }

  const all = steps.flatMap((s) => s.questions);
  return {
    nodes,
    guardrailCount: all.filter((q) => q.isGuardrail).length,
    reasonCount: all.filter((q) => !q.isGuardrail && q.answer).length,
  };
}

// Conversación antes del primer evento de pantalla: se agrupa en un paso de contexto.
function ensureIntroStep(nodes: (WorkStep | WorkGap)[], steps: WorkStep[]) {
  const intro: WorkStep = {
    kind: "step",
    id: "intro",
    t: 0,
    title: "Context before starting",
    type: "context",
    change: null,
    isDecision: false,
    questions: [],
    notes: [],
  };
  steps.unshift(intro);
  nodes.unshift(intro);
  return intro;
}
