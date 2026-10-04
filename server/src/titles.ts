import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { Session } from "./store.js";

const client = new Anthropic();
const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5-5";

const TitleSchema = z.object({ title: z.string() });

const SYSTEM = `Pones título a grabaciones en las que un experto enseña una tarea de su trabajo.
Recibes los pasos detectados en pantalla y la conversación (ya sin datos personales).
Devuelve un título de 3 a 7 palabras que diga el tema concreto de la tarea
(p. ej. "Aprobación de facturas fuera de presupuesto", "Triage de siniestros por daños de agua").
- Escribe en el idioma principal de la conversación; si no hay conversación, en el de los pasos.
- Sin comillas, sin punto final, sin fechas, sin nombres de personas ni placeholders como [PERSONA].
- Evita títulos genéricos como "Sesión de trabajo" o "Grabación".`;

/** Título por tema a partir de la línea de tiempo. null si no hay contenido suficiente. */
export async function generateTitle(session: Session): Promise<string | null> {
  const lines = session.items.flatMap((i) => {
    if (i.kind === "screen") return [`[pantalla] ${i.summary}${i.field ? ` (${i.field}: ${i.from ?? "—"} → ${i.to ?? "—"})` : ""}`];
    if (i.kind === "transcript") return [`[${i.role === "agent" ? "aprendiz" : "experto"}] ${i.text}`];
    return [];
  });
  if (lines.length === 0) return null;

  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 1000,
    // Haiku 4.5 no acepta `effort`; en el resto, "low" basta para una tarea tan corta.
    output_config: { ...(MODEL.startsWith("claude-haiku") ? {} : { effort: "low" as const }), format: zodOutputFormat(TitleSchema) },
    system: SYSTEM,
    messages: [{ role: "user", content: lines.join("\n").slice(0, 20_000) }],
  });

  const title = response.parsed_output?.title.trim().replace(/^["'«]|["'»]$/g, "").replace(/\.$/, "");
  if (response.stop_reason === "refusal" || !title) return null;
  return title.slice(0, 80);
}
