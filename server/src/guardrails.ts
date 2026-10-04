import { ORG_SESSIONS } from "./orgSessions.js";
import { listSessions, readSession, type Session } from "./store.js";

// Base de conocimiento que consulta el tutor por MCP: guardrails y razones de los expertos,
// cada uno con su paso, su momento en pantalla y las palabras exactas del experto.
// Mismo criterio que el Work Map de la web (web/src/lib/workMap.ts): mismos pasos, misma numeración.

export type Knowledge = {
  kind: "guardrail" | "reason";
  classId: string;
  classTitle: string;
  expert: string;
  workflowId: string | null;
  tags: string[];
  step: number; // desde 1, como en la clase que ve el alumno
  stepTitle: string;
  t: number; // ms desde el inicio de la grabación
  question: string | null; // null: el experto lo dijo sin que se lo preguntaran
  expertWords: string;
};

const GUARDRAIL_RE =
  /\b(nunca|jam[aá]s|siempre que|s[oó]lo si|solo si|excepci|l[ií]mite|m[aá]ximo|m[ií]nimo|parar[ií]a|par[oa]\b|escal|consult|no se puede|no deber|cu[aá]ndo no|firma de|never|only if|unless|limit|threshold|escalat|stop and|check with|sign-off|exception)/i;

type Meta = Pick<Knowledge, "classId" | "classTitle" | "expert" | "workflowId" | "tags">;
type Step = { title: string; t: number; entries: Omit<Knowledge, keyof Meta | "step" | "stepTitle">[] };

function extract(session: Session, meta: Meta): Knowledge[] {
  const steps: Step[] = [];
  let open: { question: string; t: number; isGuardrail: boolean; step: Step } | null = null;
  const intro = () => {
    if (steps[0]?.title !== "Context before starting") steps.unshift({ title: "Context before starting", t: 0, entries: [] });
    return steps[0];
  };
  const stepFor = (summary?: string | null) => (summary && [...steps].reverse().find((s) => s.title === summary)) || steps.at(-1) || null;

  for (const item of [...session.items].sort((a, b) => a.t - b.t)) {
    if (item.kind === "gap") continue;
    if (item.kind === "screen") {
      steps.push({ title: item.summary, t: item.t, entries: [] });
      continue;
    }
    if (item.role === "agent") {
      if (item.isQuestion) open = { question: item.text, t: item.t, isGuardrail: GUARDRAIL_RE.test(item.text), step: stepFor(item.aboutEvent) ?? intro() };
      continue;
    }
    if (open) {
      const kind = open.isGuardrail || GUARDRAIL_RE.test(item.text) ? "guardrail" : "reason";
      open.step.entries.push({ kind, t: open.t, question: open.question, expertWords: item.text });
      open = null;
    } else if (GUARDRAIL_RE.test(item.text)) {
      // Una regla dicha sin pregunta también es un guardrail.
      (stepFor() ?? intro()).entries.push({ kind: "guardrail", t: item.t, question: null, expertWords: item.text });
    }
  }
  return steps.flatMap((s, i) => s.entries.map((e) => ({ ...meta, ...e, step: i + 1, stepTitle: s.title })));
}

/** Todo lo aprendido: sesiones de la organización + las guardadas en este server. */
export async function loadKnowledge(): Promise<Knowledge[]> {
  const org = ORG_SESSIONS.flatMap((s) =>
    extract(s.session, { classId: s.id, classTitle: s.title, expert: s.owner, workflowId: s.workflowId, tags: s.tags }),
  );
  const saved = (await listSessions()).filter((s) => s.status === "saved");
  const mine = await Promise.all(
    saved.map(async (s) =>
      extract(await readSession(s.id), { classId: s.id, classTitle: s.title ?? "Untitled session", expert: "the expert", workflowId: s.workflowId, tags: [] }),
    ),
  );
  return [...org, ...mine.flat()];
}

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ");
const words = (s: string) => normalize(s).split(/\s+/).filter((w) => w.length > 2);

function score(query: string[], text: string, weight: number) {
  const hay = words(text);
  return query.reduce(
    (acc, q) => acc + (hay.includes(q) ? weight : hay.some((h) => h.startsWith(q.slice(0, 5)) || q.startsWith(h.slice(0, 5))) ? weight / 2 : 0),
    0,
  );
}

/** Lo más relevante para una situación descrita por el tutor (acción, paso, importe, tema...). */
export function search(all: Knowledge[], query: string, opts: { includeReasons: boolean; limit: number }) {
  const q = words(query);
  return all
    .filter((k) => opts.includeReasons || k.kind === "guardrail")
    .map((k) => ({
      k,
      s:
        score(q, `${k.expertWords} ${k.question ?? ""}`, 2) +
        score(q, k.stepTitle, 2) +
        score(q, `${k.classTitle} ${k.tags.join(" ")} ${k.workflowId ?? ""}`, 1) +
        (k.kind === "guardrail" ? 0.5 : 0),
    }))
    .filter((x) => q.length === 0 || x.s > 0.5)
    .sort((a, b) => b.s - a.s)
    // Solo lo que se acerca al mejor resultado: una palabra suelta en común no basta.
    .filter((x, _, sorted) => q.length === 0 || x.s >= sorted[0].s * 0.5)
    .slice(0, opts.limit)
    .map((x) => x.k);
}

/** La clase que mejor coincide con un tema, con todos sus guardrails y razones en orden. */
export function forClass(all: Knowledge[], topic: string) {
  const q = words(topic);
  const classes = new Map<string, Knowledge[]>();
  for (const k of all) classes.set(k.classId, [...(classes.get(k.classId) ?? []), k]);
  let best: { items: Knowledge[]; s: number } | null = null;
  for (const items of classes.values()) {
    const { classTitle, tags, workflowId } = items[0];
    const s = score(q, `${classTitle} ${tags.join(" ")} ${workflowId ?? ""}`, 1);
    if (s > 0 && (!best || s > best.s)) best = { items, s };
  }
  return best ? best.items.sort((a, b) => a.step - b.step || a.t - b.t) : null;
}

const clock = (ms: number) => `${String(Math.floor(ms / 60_000)).padStart(2, "0")}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}`;

/** Texto para el agente: la regla en palabras del experto y dónde aparece en la grabación. */
export function describe(k: Knowledge) {
  return [
    `${k.kind === "guardrail" ? "GUARDRAIL" : "REASON"} — class "${k.classTitle}" by ${k.expert}, step ${k.step} "${k.stepTitle}", screen moment ${clock(k.t)}`,
    `Expert's words: "${k.expertWords}"`,
    k.question ? `Asked: "${k.question}"` : "Said without being asked.",
  ].join("\n");
}
