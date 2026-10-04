// ─────────────────────────────────────────────────────────────────────────────
// PLACEHOLDERS: funciones sin backend todavía. Devuelven datos de ejemplo
// (mockData.ts) con un pequeño retardo. Sustituye el cuerpo por la llamada a tu API.
// ─────────────────────────────────────────────────────────────────────────────
import { getOrgSession, getSession, listOrgSessions, type Session, type SessionSummary } from "./api";
import { MOCK_STATS, MOCK_USER, MOCK_WORKFLOWS, type Stats, type User, type Workflow } from "./mockData";
import { sessionTitle } from "./format";
import { buildLesson, type Lesson } from "./lesson";
import type { Teaching } from "./teachings";
import { buildWorkMap, type WorkMap } from "./workMap";

export { getSignedUrl } from "./api"; // GET /api/signed-url (server real)

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** PLACEHOLDER: autenticación real (OAuth/SSO). */
export async function signIn(): Promise<User> {
  await delay(400);
  return MOCK_USER;
}

/** PLACEHOLDER: cerrar sesión en el proveedor de identidad. */
export async function signOut(): Promise<void> {
  await delay(150);
}

/** PLACEHOLDER: sesiones grabadas por los profesores de la organización (ejemplos del server, que también usa el MCP). */
export async function fetchOrgSessions(): Promise<SessionSummary[]> {
  return listOrgSessions();
}

/** PLACEHOLDER: detalle de una sesión de otra persona de la organización. */
export async function fetchOrgSession(id: string): Promise<Session | null> {
  return getOrgSession(id);
}

/** PLACEHOLDER: catálogo de workflows. */
export async function fetchWorkflows(): Promise<Workflow[]> {
  await delay(350);
  return MOCK_WORKFLOWS;
}

/** PLACEHOLDER: métricas agregadas de la organización. */
export async function fetchStats(): Promise<Stats> {
  await delay(350);
  return MOCK_STATS;
}

/** PLACEHOLDER: la fase Map generará el Work Map con IA; hoy se deriva de la línea de tiempo. */
export async function generateWorkMap(session: Session): Promise<WorkMap> {
  return buildWorkMap(session.items);
}

/**
 * PLACEHOLDER: la fase Teach creará una sesión de tutor dedicada.
 * Hoy la lección se deriva del Work Map provisional y la enseña el agente compartido.
 */
export async function loadLesson(t: Teaching): Promise<{ session: Session | null; map: WorkMap | null; lesson: Lesson | null }> {
  const session = t.source === "org" ? await fetchOrgSession(t.id) : await getSession(t.id);
  if (!session) return { session: null, map: null, lesson: null };
  const map = await generateWorkMap(session);
  return { session, map, lesson: buildLesson(sessionTitle(t), map) };
}
