import express from "express";
import cors from "cors";
import { detectEvents } from "./vision.js";
import { appendItems, readSession, type TimelineItem } from "./store.js";

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

app.post("/api/session/:id/events", async (req, res) => {
  try {
    const items = (req.body.items ?? []) as TimelineItem[];
    const session = await appendItems(req.params.id, items);
    res.json({ ok: true, count: session.items.length });
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

const port = Number(process.env.PORT) || 3001;
app.listen(port, () => console.log(`Server en http://localhost:${port}`));
