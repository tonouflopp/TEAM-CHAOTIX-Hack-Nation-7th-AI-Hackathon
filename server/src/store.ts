import { promises as fs } from "node:fs";
import path from "node:path";

const DATA_DIR = path.resolve("data");

export type ScreenEvent = {
  t: number;
  type: string;
  entity: string;
  field: string | null;
  from: string | null;
  to: string | null;
  summary: string;
};

// Una entrada de la línea de tiempo: evento de pantalla, turno de voz o hueco "fuera de registro".
export type TimelineItem =
  | ({ kind: "screen" } & ScreenEvent)
  | { kind: "transcript"; t: number; role: "agent" | "expert"; text: string; isQuestion?: boolean; aboutEvent?: string | null }
  | { kind: "gap"; t: number; until: number | null };

export type Session = { id: string; createdAt: number; items: TimelineItem[] };

function fileFor(id: string) {
  if (!/^[\w-]{1,64}$/.test(id)) throw new Error("sessionId inválido");
  return path.join(DATA_DIR, `${id}.json`);
}

export async function readSession(id: string): Promise<Session> {
  try {
    return JSON.parse(await fs.readFile(fileFor(id), "utf8"));
  } catch (err: any) {
    if (err.code === "ENOENT") return { id, createdAt: Date.now(), items: [] };
    throw err;
  }
}

// Escrituras serializadas por sesión para no pisar el archivo con peticiones concurrentes.
const queues = new Map<string, Promise<unknown>>();

export function appendItems(id: string, items: TimelineItem[]): Promise<Session> {
  const prev = queues.get(id) ?? Promise.resolve();
  const next = prev.catch(() => {}).then(async () => {
    const session = await readSession(id);
    session.items.push(...items);
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(fileFor(id), JSON.stringify(session, null, 2));
    return session;
  });
  queues.set(id, next);
  return next;
}
