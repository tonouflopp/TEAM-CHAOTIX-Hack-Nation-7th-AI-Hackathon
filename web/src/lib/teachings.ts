import type { SessionSummary } from "./api";

// Una "enseñanza" es una sesión guardada de cualquier profesor de la organización.
export type Teaching = SessionSummary & { owner: string; tags: string[]; source: "org" | "mine" };

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ");

const words = (s: string) => normalize(s).split(/\s+/).filter((w) => w.length > 2);

/** Mejor coincidencia por título y etiquetas para open_session({ topic }). */
export function findTeaching(teachings: Teaching[], topic: string): Teaching | null {
  const query = words(topic);
  if (query.length === 0) return null;
  let best: { t: Teaching; score: number } | null = null;
  for (const t of teachings) {
    const haystack = words(`${t.title ?? ""} ${t.tags.join(" ")}`);
    const score = query.reduce(
      (acc, q) => acc + (haystack.includes(q) ? 2 : haystack.some((h) => h.startsWith(q.slice(0, 5)) || q.startsWith(h.slice(0, 5))) ? 1 : 0),
      0,
    );
    if (score > 0 && (!best || score > best.score)) best = { t, score };
  }
  return best?.t ?? null;
}
