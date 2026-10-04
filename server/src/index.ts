import express from "express";
import cors from "cors";
import { detectEvents } from "./vision.js";
import { appendItems, deleteSession, listSessions, readSession, saveThumbnail, saveVideo, setMeta, thumbnailPath, videoPath, type SessionMeta, type TimelineItem } from "./store.js";
import { generateTitle } from "./titles.js";
import { presidioHealthy, redactAll } from "./redact.js";
import { handleMcp } from "./mcp.js";
import { ORG_SESSIONS } from "./orgSessions.js";

// TEMPORAL: verificar qué llaves se cargaron (solo prefijo y longitud, nunca la llave completa).
console.log(`[env] cwd=${process.cwd()}`);
for (const name of ["ELEVENLABS_API_KEY", "ANTHROPIC_API_KEY"]) {
  const v = process.env[name] ?? "";
  console.log(`[env] ${name}: ${v.slice(0, 3)}… len=${v.length}`);
}

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));

// URL firmada para que el navegador hable con el agente sin ver la API key.
app.get("/api/signed-url", async (_req, res) => {
  const url = `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${process.env.ELEVENLABS_AGENT_ID}`;
  const r = await fetch(url, { headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY ?? "" } });
  if (!r.ok) return res.status(502).json({ error: `ElevenLabs ${r.status}: ${await r.text()}` });
  const { signed_url } = (await r.json()) as { signed_url: string };
  res.json({ signedUrl: signed_url });
});

// Sesiones de otros profesores de la organización (ejemplo hasta que haya backend de organización).
app.get("/api/org/sessions", (_req, res) => {
  res.json(ORG_SESSIONS.map(({ session: _session, ...summary }) => summary));
});

app.get("/api/org/sessions/:id", (req, res) => {
  const found = ORG_SESSIONS.find((s) => s.id === req.params.id);
  if (!found) return res.sendStatus(404);
  res.json(found.session);
});

// Servidor MCP para el tutor: búsqueda de guardrails (ver mcp.ts). Sin estado: solo POST.
app.post("/api/mcp", handleMcp);
app.all("/api/mcp", (_req, res) => {
  res.set("Allow", "POST").status(405).json({ jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed." }, id: null });
});

// Un frame de pantalla -> eventos de cambio. El cliente guarda los eventos (para respetar "fuera de registro").
app.post("/api/frame", async (req, res) => {
  const { imageBase64, t, prevState } = req.body as { sessionId: string; imageBase64: string; t: number; prevState?: string };
  if (!imageBase64) return res.status(400).json({ error: "imageBase64 requerido" });
  try {
    res.json(await detectEvents(imageBase64, prevState ?? "", t));
  } catch (err) {
    console.error("[frame]", err);
    res.status(500).json({ error: String(err) });
  }
});

// Filtra con Presidio los textos libres de cada item antes de guardarlo.
async function redactItem(item: TimelineItem): Promise<TimelineItem> {
  if (item.kind === "transcript") {
    const { texts, by } = await redactAll([item.text]);
    return { ...item, text: texts[0] ?? "", redactedBy: by };
  }
  if (item.kind === "screen") {
    const { texts, by } = await redactAll([item.summary, item.from, item.to]);
    return { ...item, summary: texts[0] ?? "", from: texts[1], to: texts[2], redactedBy: by };
  }
  return item;
}

// Devuelve los items ya filtrados para que la UI nunca muestre el texto original.
app.post("/api/session/:id/events", async (req, res) => {
  try {
    const items = await Promise.all(((req.body.items ?? []) as TimelineItem[]).map(redactItem));
    await appendItems(req.params.id, items);
    res.json({ items });
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

app.get("/api/session/:id/events", async (req, res) => {
  try {
    res.json(await readSession(req.params.id));
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

app.get("/api/sessions", async (_req, res) => {
  res.json(await listSessions());
});

app.patch("/api/session/:id", async (req, res) => {
  try {
    const { title, workflowId, status, durationMs } = req.body as SessionMeta;
    const session = await setMeta(req.params.id, { title, workflowId, status, durationMs });
    res.json(session.meta);
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

app.delete("/api/session/:id", async (req, res) => {
  try {
    await deleteSession(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

// Miniatura ya difuminada en el navegador: representa la sesión sin que se lea ningún dato.
app.put("/api/session/:id/thumbnail", async (req, res) => {
  try {
    await saveThumbnail(req.params.id, req.body.imageBase64);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

app.get("/api/session/:id/thumbnail", (req, res) => {
  try {
    res.sendFile(thumbnailPath(req.params.id), (err) => err && !res.headersSent && res.sendStatus(404));
  } catch {
    res.sendStatus(400);
  }
});

// Vídeo de la sesión: se recibe en streaming y se sirve con soporte de rangos (para poder avanzar/retroceder).
app.put("/api/session/:id/video", async (req, res) => {
  try {
    await saveVideo(req.params.id, req);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

app.get("/api/session/:id/video", (req, res) => {
  try {
    res.type("video/webm").sendFile(videoPath(req.params.id), (err) => err && !res.headersSent && res.sendStatus(404));
  } catch {
    res.sendStatus(400);
  }
});

// Título por tema, generado con Claude a partir de la línea de tiempo ya filtrada.
app.post("/api/session/:id/title", async (req, res) => {
  try {
    const title = await generateTitle(await readSession(req.params.id));
    if (!title) return res.json({ title: null });
    await setMeta(req.params.id, { title });
    res.json({ title });
  } catch (err) {
    console.error("[title]", err);
    res.status(500).json({ error: String(err) });
  }
});

// En Vercel la función usa la app exportada; en local levantamos el puerto.
export default app;

if (!process.env.VERCEL) {
  const port = Number(process.env.PORT) || 3001;
  app.listen(port, async () => {
    console.log(`Server en http://localhost:${port}`);
    console.log(`[redact] Presidio ${(await presidioHealthy()) ? "conectado" : "NO disponible: se usará filtro regex"}`);
  });
}
