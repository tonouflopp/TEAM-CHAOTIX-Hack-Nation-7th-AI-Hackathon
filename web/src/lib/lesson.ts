import { useSyncExternalStore } from "react";
import type { WorkMap, WorkStep } from "./workMap";

// Una lección = los pasos del Work Map en orden, numerados desde 1 (el contexto inicial también cuenta).

export type Lesson = { title: string; steps: WorkStep[] };

/** Ruta de una clase; con voice=true la página arranca la clase con Sage. */
export const lessonPath = (id: string, voice = false) => `/learn/teachings/${id}${voice ? "?mode=voice" : ""}`;

export function buildLesson(title: string, map: WorkMap): Lesson {
  return { title, steps: map.nodes.filter((n): n is WorkStep => n.kind === "step") };
}

/** Texto que recibe el agente: el Work Map con la misma numeración que ve el alumno. */
export function lessonBriefing(lesson: Lesson): string {
  const lines = lesson.steps.flatMap((step, i) => [
    `Paso ${i + 1}: ${step.title}${step.change ? ` (${step.change})` : ""}`,
    ...step.questions.filter((q) => q.answer).map((q) => `  ${q.isGuardrail ? "Guardrail" : "Razón"}: ${q.answer}`),
    ...step.notes.map((n) => `  Nota del experto: ${n}`),
  ]);
  return `[LECCIÓN] Work Map de "${lesson.title}" (${lesson.steps.length} pasos):\n${lines.join("\n") || "(sin pasos registrados)"}`;
}

/** Lo que el agente lee cuando muestra un paso con show_step. */
export function stepBriefing(lesson: Lesson, index: number): string {
  const step = lesson.steps[index];
  const why = step.questions.filter((q) => q.answer).map((q) => `${q.isGuardrail ? "Guardrail" : "Razón"}: ${q.answer}`);
  return [`Paso ${index + 1} de ${lesson.steps.length}: ${step.title}`, step.change, ...why, ...step.notes].filter(Boolean).join("\n");
}

// ─── Estado de la clase compartido entre la página y las herramientas del agente ───

type ClassState = { lessonId: string | null; lesson: Lesson | null; step: number; voice: boolean };

let state: ClassState = { lessonId: null, lesson: null, step: 0, voice: false };
const listeners = new Set<() => void>();

function set(patch: Partial<ClassState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export const classroom = {
  get: () => state,
  /** La página de la lección se registra al cargar; si cambia de lección, la clase de voz se cierra. */
  open(lessonId: string, lesson: Lesson) {
    if (state.lessonId === lessonId) set({ lesson });
    else set({ lessonId, lesson, step: Math.min(progress.resumeAt(lessonId), Math.max(0, lesson.steps.length - 1)), voice: false });
  },
  goTo(step: number) {
    if (!state.lesson) return;
    const clamped = Math.max(0, Math.min(step, state.lesson.steps.length - 1));
    if (state.lessonId) progress.visit(state.lessonId, clamped, state.lesson.steps.length);
    set({ step: clamped });
  },
  setVoice(voice: boolean) {
    set({ voice });
  },
  /** El agente abrió la clase (start_class): queda lista para show_step aunque la página aún no haya cargado. */
  startVoice(lessonId: string, lesson: Lesson) {
    if (state.lessonId === lessonId) set({ lesson, voice: true });
    else set({ lessonId, lesson, step: 0, voice: true });
  },
};

export function useClassroom() {
  return useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => state,
  );
}

// ─── Progreso del alumno (solo en este navegador) ───

const KEY = "sage.progress";
type Progress = Record<string, { seen: number[]; total: number; at: number }>;

function read(): Progress {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}");
  } catch {
    return {};
  }
}

export const progress = {
  all: read,
  of(lessonId: string) {
    return read()[lessonId] ?? null;
  },
  resumeAt(lessonId: string) {
    const p = read()[lessonId];
    if (!p) return 0;
    const next = Array.from({ length: p.total }, (_, i) => i).find((i) => !p.seen.includes(i));
    return next ?? 0;
  },
  visit(lessonId: string, step: number, total: number) {
    const all = read();
    const seen = new Set(all[lessonId]?.seen ?? []);
    seen.add(step);
    all[lessonId] = { seen: [...seen].sort((a, b) => a - b), total, at: Date.now() };
    try {
      localStorage.setItem(KEY, JSON.stringify(all));
    } catch {
      // sin almacenamiento: el progreso solo dura esta visita
    }
  },
};
