// Llamadas al server real (/server). Lo que aún no tiene backend vive en placeholders.ts.

export type ScreenEvent = {
  t: number;
  type: string;
  entity: string;
  field: string | null;
  from: string | null;
  to: string | null;
  summary: string;
};

export type RedactedBy = "presidio" | "regex";

export type TimelineItem =
  | ({ kind: "screen"; redactedBy?: RedactedBy } & ScreenEvent)
  | {
      kind: "transcript";
      t: number;
      role: "agent" | "expert";
      text: string;
      isQuestion?: boolean;
      aboutEvent?: string | null;
      redactedBy?: RedactedBy;
    }
  | { kind: "gap"; t: number; until: number | null };

export type SessionMeta = {
  title?: string;
  workflowId?: string | null;
  status?: "recording" | "saved";
  durationMs?: number;
};

export type SessionSummary = {
  id: string;
  createdAt: number;
  title: string | null;
  workflowId: string | null;
  status: "recording" | "saved";
  durationMs: number;
  stepCount: number;
  questionCount: number;
  hasThumbnail: boolean;
  hasVideo?: boolean;
  owner?: string; // solo en sesiones de la organización
  tags?: string[];
  thumbnailUrl?: string | null;
};

export type Session = { id: string; createdAt: number; meta?: SessionMeta; items: TimelineItem[] };

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

const jsonInit = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export async function getSignedUrl(): Promise<string> {
  const { signedUrl } = await json<{ signedUrl: string }>(await fetch("/api/signed-url"));
  return signedUrl;
}

export async function analyzeFrame(body: { sessionId: string; imageBase64: string; t: number; prevState: string }) {
  return json<{ screenState: string; events: ScreenEvent[] }>(await fetch("/api/frame", jsonInit("POST", body)));
}

/** Guarda items; el server los devuelve ya filtrados por Presidio. */
export async function saveItems(sessionId: string, items: TimelineItem[]): Promise<TimelineItem[]> {
  const res = await json<{ items: TimelineItem[] }>(await fetch(`/api/session/${sessionId}/events`, jsonInit("POST", { items })));
  return res.items;
}

export async function listSessions(): Promise<SessionSummary[]> {
  const sessions = await json<SessionSummary[]>(await fetch("/api/sessions"));
  return sessions.map((s) => ({ ...s, thumbnailUrl: s.hasThumbnail ? thumbnailUrl(s.id) : null }));
}

export async function getSession(id: string): Promise<Session> {
  return json<Session>(await fetch(`/api/session/${id}/events`));
}

// Sesiones de otros profesores de la organización (hoy, ejemplos servidos por el server).
export async function listOrgSessions(): Promise<SessionSummary[]> {
  return json<SessionSummary[]>(await fetch("/api/org/sessions"));
}

export async function getOrgSession(id: string): Promise<Session | null> {
  const res = await fetch(`/api/org/sessions/${encodeURIComponent(id)}`);
  return res.status === 404 ? null : json<Session>(res);
}

export async function updateSessionMeta(id: string, meta: SessionMeta) {
  return json<SessionMeta>(await fetch(`/api/session/${id}`, jsonInit("PATCH", meta)));
}

export async function deleteSession(id: string) {
  await json(await fetch(`/api/session/${id}`, { method: "DELETE" }));
}

export async function saveThumbnail(id: string, imageBase64: string) {
  await json(await fetch(`/api/session/${id}/thumbnail`, jsonInit("PUT", { imageBase64 })));
}

export function thumbnailUrl(id: string) {
  return `/api/session/${id}/thumbnail`;
}

/** Sube el vídeo grabado (webm) al server. */
export async function uploadVideo(id: string, video: Blob) {
  await json(await fetch(`/api/session/${id}/video`, { method: "PUT", headers: { "Content-Type": video.type || "video/webm" }, body: video }));
}

export function videoUrl(id: string) {
  return `/api/session/${id}/video`;
}

/** Pide al server un título por tema (Claude) y lo guarda. null si no hay contenido suficiente. */
export async function generateTitle(id: string): Promise<string | null> {
  const res = await json<{ title: string | null }>(await fetch(`/api/session/${id}/title`, { method: "POST" }));
  return res.title;
}
