import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { ScreenEvent } from "./store.js";

const client = new Anthropic();
const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5-5";

const OutputSchema = z.object({
  // Descripción breve y anonimizada de lo que hay en pantalla; el cliente la reenvía en el siguiente frame.
  screenState: z.string(),
  events: z.array(
    z.object({
      type: z.enum(["navigate", "open", "edit", "select", "submit", "approve", "reject", "search", "error", "other"]),
      entity: z.string(),
      field: z.string().nullable(),
      from: z.string().nullable(),
      to: z.string().nullable(),
      summary: z.string(),
    }),
  ),
});

const SYSTEM = `Observas capturas de pantalla de un experto haciendo una tarea de trabajo.
Comparas la captura actual con el "estado anterior" y reportas SOLO cambios relevantes para la tarea.

Reglas:
- Devuelve únicamente el JSON pedido. Si nada relevante cambió, "events" debe ser [].
- Ignora ruido: movimiento del cursor, hover, animaciones, relojes, notificaciones, scroll sin contenido nuevo.
- Un evento = una acción de negocio (abrir un registro, cambiar un campo, aprobar, rechazar, buscar, error visible...).
- "summary": máx. 12 palabras, en español, describe la acción (p. ej. "Cambia estado de factura a Aprobada").
- PRIVACIDAD: nunca copies datos personales. Sustituye nombres de personas por [PERSONA], emails por [EMAIL],
  IBAN/cuentas por [IBAN], teléfonos por [TELEFONO], documentos de identidad por [ID], direcciones por [DIRECCION].
  Importes, estados, nombres de campos y de pantallas sí se pueden copiar.
- "screenState": 1-3 frases sobre qué aplicación/pantalla/registro está visible y sus campos clave (anonimizado).`;

export async function detectEvents(imageBase64: string, prevState: string, t: number) {
  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 2000,
    // Haiku 4.5 no acepta `effort`; en el resto se usa "low" para bajar latencia.
    output_config: { ...(MODEL.startsWith("claude-haiku") ? {} : { effort: "low" as const }), format: zodOutputFormat(OutputSchema) },
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: `Estado anterior de la pantalla:\n${prevState || "(primera captura, sin estado previo)"}` },
          { type: "image", source: { type: "base64", media_type: "image/jpeg", data: imageBase64 } },
          { type: "text", text: "Captura actual. Devuelve los eventos de cambio y el nuevo screenState." },
        ],
      },
    ],
  });

  const out = response.parsed_output;
  if (response.stop_reason === "refusal" || !out) return { screenState: prevState, events: [] as ScreenEvent[] };
  return {
    screenState: out.screenState,
    events: out.events.map((e): ScreenEvent => ({ t, ...e })),
  };
}
