import { createWriteStream, promises as fs } from "node:fs";
import { pipeline } from "node:stream/promises";
import type { Readable } from "node:stream";
import path from "node:path";

// En Vercel el disco es de solo lectura salvo /tmp (efímero, por instancia).
const DATA_DIR = process.env.VERCEL ? "/tmp/sage-data" : path.resolve("data");

export type ScreenEvent = {
  t: number;
  type: string;
  entity: string;
  field: string | null;
  from: string | null;
  to: string | null;
  summary: string;
};

type Redaction = { redactedBy?: "presidio" | "regex" };

// Una entrada de la línea de tiempo: evento de pantalla, turno de voz o hueco "fuera de registro".
export type TimelineItem =
  | ({ kind: "screen" } & ScreenEvent & Redaction)
  | ({ kind: "transcript"; t: number; role: "agent" | "expert"; text: string; isQuestion?: boolean; aboutEvent?: string | null } & Redaction)
  | { kind: "gap"; t: number; until: number | null };

export type SessionMeta = {
  title?: string;
  workflowId?: string | null;
  status?: "recording" | "saved";
  durationMs?: number;
};

export type Session = { id: string; createdAt: number; meta?: SessionMeta; items: TimelineItem[] };

function fileFor(id: string, ext = "json") {
  if (!/^[\w-]{1,64}$/.test(id)) throw new Error("sessionId inválido");
  return path.join(DATA_DIR, `${id}.${ext}`);
}

export async function readSession(id: string): Promise<Session> {
  try {
    const session: Session = JSON.parse(await fs.readFile(fileFor(id), "utf8"));
    // El nombre del archivo manda: si se renombró a mano, ese nombre pasa a ser el id y el título.
    if (session.id !== id) session.meta = { ...session.meta, title: id.replace(/_/g, " ") };
    return { ...session, id };
  } catch (err: any) {
    if (err.code === "ENOENT") return { id, createdAt: Date.now(), items: [] };
    throw err;
  }
}

// Escrituras serializadas por sesión para no pisar el archivo con peticiones concurrentes.
const queues = new Map<string, Promise<unknown>>();

function update(id: string, change: (session: Session) => void): Promise<Session> {
  const prev = queues.get(id) ?? Promise.resolve();
  const next = prev.catch(() => {}).then(async () => {
    const session = await readSession(id);
    change(session);
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(fileFor(id), JSON.stringify(session, null, 2));
    return session;
  });
  queues.set(id, next);
  return next;
}

export function appendItems(id: string, items: TimelineItem[]) {
  return update(id, (s) => s.items.push(...items));
}

export function setMeta(id: string, meta: SessionMeta) {
  // Solo se sobrescriben los campos enviados (un PATCH parcial no borra el título).
  const defined = Object.fromEntries(Object.entries(meta).filter(([, v]) => v !== undefined));
  return update(id, (s) => (s.meta = { ...s.meta, ...defined }));
}

export async function deleteSession(id: string) {
  await queues.get(id)?.catch(() => {});
  await Promise.all(["json", "jpg", "webm"].map((ext) => fs.rm(fileFor(id, ext), { force: true })));
}

export async function saveThumbnail(id: string, imageBase64: string) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(fileFor(id, "jpg"), Buffer.from(imageBase64, "base64"));
}

export function thumbnailPath(id: string) {
  return fileFor(id, "jpg");
}

/** Guarda el vídeo (webm) en streaming, sin cargarlo entero en memoria. */
export async function saveVideo(id: string, body: Readable) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await pipeline(body, createWriteStream(fileFor(id, "webm")));
}

export function videoPath(id: string) {
  return fileFor(id, "webm");
}

export async function listSessions() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  // Se ignoran archivos con nombre no válido (p. ej. ".json") para que uno raro no rompa la lista.
  const files = (await fs.readdir(DATA_DIR)).filter((f) => /^[\w-]{1,64}\.json$/.test(f));
  const sessions = await Promise.all(
    files.map(async (f) => {
      const s = await readSession(f.replace(/\.json$/, ""));
      const exists = (ext: string) => fs.access(fileFor(s.id, ext)).then(() => true, () => false);
      const [hasThumbnail, hasVideo] = await Promise.all([exists("jpg"), exists("webm")]);
      return {
        id: s.id,
        createdAt: s.createdAt,
        title: s.meta?.title ?? null,
        workflowId: s.meta?.workflowId ?? null,
        status: s.meta?.status ?? "saved",
        durationMs: s.meta?.durationMs ?? Math.max(0, ...s.items.map((i) => i.t)),
        stepCount: s.items.filter((i) => i.kind === "screen").length,
        questionCount: s.items.filter((i) => i.kind === "transcript" && i.isQuestion).length,
        hasThumbnail,
        hasVideo,
      };
    }),
  );
  return sessions.sort((a, b) => b.createdAt - a.createdAt);
}
