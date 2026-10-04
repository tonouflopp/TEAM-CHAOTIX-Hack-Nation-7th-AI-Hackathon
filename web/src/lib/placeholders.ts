// ─────────────────────────────────────────────────────────────────────────────
// PLACEHOLDERS: funciones sin backend todavía. Devuelven datos de ejemplo
// (mockData.ts) con un pequeño retardo. Sustituye el cuerpo por la llamada a tu API.
// ─────────────────────────────────────────────────────────────────────────────
import { getSession, type Session, type SessionSummary } from "./api";
import { MOCK_ORG_SESSIONS, MOCK_STATS, MOCK_USER, MOCK_WORKFLOWS, type Stats, type User, type Workflow } from "./mockData";
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

/** PLACEHOLDER: sesiones grabadas por los profesores de la organización. */
export async function fetchOrgSessions(): Promise<SessionSummary[]> {
  await delay(400);
  return MOCK_ORG_SESSIONS.map(({ session: _session, ...summary }) => summary);
}

/** PLACEHOLDER: detalle de una sesión de otra persona de la organización. */
export async function fetchOrgSession(id: string): Promise<Session | null> {
  await delay(250);
  return MOCK_ORG_SESSIONS.find((s) => s.id === id)?.session ?? null;
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
 * Hoy prepara el contexto de la lección (Work Map en texto) para el agente compartido.
 */
export async function startTutorSession(sessionId: string): Promise<{ title: string; briefing: string; kickoff: string }> {
  const mock = MOCK_ORG_SESSIONS.find((s) => s.id === sessionId);
  const session = mock ? mock.session : await getSession(sessionId);
  const title = mock?.title ?? session.meta?.title ?? "this session";
  const map = buildWorkMap(session.items);

  const lines: string[] = [];
  let n = 0;
  for (const node of map.nodes) {
    if (node.kind !== "step") continue;
    lines.push(`${node.id === "intro" ? "Contexto" : `Paso ${++n}`}: ${node.title}${node.change ? ` (${node.change})` : ""}`);
    for (const q of node.questions) {
      if (q.answer) lines.push(`  ${q.isGuardrail ? "Guardrail" : "Razón"}: ${q.answer}`);
    }
  }
  return {
    title,
    briefing: `[LECCIÓN] Work Map de "${title}":\n${lines.join("\n") || "(sin pasos registrados)"}`,
    kickoff: `[LECCIÓN] Empieza la lección sobre "${title}".`,
  };
}
