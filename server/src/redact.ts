// Filtra datos personales con Microsoft Presidio (servicio local en /presidio).
// Si Presidio no responde, se aplica un filtro de regex básico para no guardar nunca texto sin filtrar.

const PRESIDIO_URL = process.env.PRESIDIO_URL || "http://127.0.0.1:5002";

export type Redactor = "presidio" | "regex";

const FALLBACK_PATTERNS: [RegExp, string][] = [
  [/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[EMAIL]"],
  [/\b[A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]{4}){3,7}(?:[ ]?[A-Z0-9]{1,4})?\b/g, "[IBAN]"],
  [/\b\d{8}[A-Z]\b|\b[XYZ]\d{7}[A-Z]\b/g, "[ID]"],
  [/(?:\+\d{2}[ ]?)?\b\d{3}[ ]?\d{2,3}[ ]?\d{2,3}[ ]?\d{0,3}\b/g, "[TELEFONO]"],
];

function regexRedact(text: string) {
  return FALLBACK_PATTERNS.reduce((acc, [re, label]) => acc.replace(re, label), text);
}

async function presidio(text: string): Promise<string> {
  const res = await fetch(`${PRESIDIO_URL}/anonymize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, language: "es" }),
    signal: AbortSignal.timeout(4000),
  });
  if (!res.ok) throw new Error(`Presidio ${res.status}`);
  return ((await res.json()) as { text: string }).text;
}

let warned = false;

/** Filtra varios textos; todos con el mismo método para que el item sea coherente. */
export async function redactAll(texts: (string | null)[]): Promise<{ texts: (string | null)[]; by: Redactor }> {
  try {
    const out = await Promise.all(texts.map((t) => (t ? presidio(t) : t)));
    return { texts: out, by: "presidio" };
  } catch (err) {
    if (!warned) console.warn(`[redact] Presidio no disponible en ${PRESIDIO_URL}; usando regex. (${err})`);
    warned = true;
    return { texts: texts.map((t) => (t ? regexRedact(t) : t)), by: "regex" };
  }
}

export async function presidioHealthy() {
  try {
    const res = await fetch(`${PRESIDIO_URL}/health`, { signal: AbortSignal.timeout(1500) });
    return res.ok;
  } catch {
    return false;
  }
}
