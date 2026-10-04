// Configura el agente de ElevenLabs a partir de docs/agent-prompt.md:
// crea o actualiza las client tools, activa Skip turn y sustituye prompt y primer mensaje.
//   node --env-file=key.env scripts/setup-agent.mjs [--dry-run]
import { readFile } from "node:fs/promises";

const API = "https://api.elevenlabs.io/v1/convai";
const { ELEVENLABS_API_KEY: key, ELEVENLABS_AGENT_ID: agentId } = process.env;
const dryRun = process.argv.includes("--dry-run");
if (!key || !agentId) throw new Error("Faltan ELEVENLABS_API_KEY o ELEVENLABS_AGENT_ID (usa --env-file).");

const str = (description) => ({ type: "string", description });

// Mismos nombres y parámetros que web/src/hooks/useAgentTools.ts.
const TOOLS = [
  {
    name: "navigate",
    description: "Switch the app to another tab. Use it whenever the user asks to go to Home, Teach or Learn.",
    parameters: { page: { type: "string", enum: ["home", "teach", "learn"], description: "Tab to open" } },
    required: ["page"],
  },
  { name: "start_recording", description: "Open Teach and start recording the expert's screen.", parameters: {}, required: [] },
  { name: "open_teachings", description: "Open the class catalog in Learn. Returns the list of class titles.", parameters: {}, required: [] },
  {
    name: "open_session",
    description: "Open the class that best matches a topic in self-paced mode (the learner reads it on their own).",
    parameters: { topic: str("Topic or title in English words, e.g. 'invoice over budget'") },
    required: ["topic"],
  },
  {
    name: "start_class",
    description:
      "Open a class and start teaching it by voice. Returns the class Work Map (numbered steps, reasons, guardrails). Leave topic empty to teach the class already open on screen.",
    parameters: { topic: str("Topic or title in English words; empty for the class on screen") },
    required: [],
  },
  {
    name: "show_step",
    description: "Show a step of the current class on screen. Call it before explaining each step. Returns that step's content.",
    parameters: { step: { type: "integer", description: "Step number, starting at 1" } },
    required: ["step"],
  },
  { name: "end_class", description: "End the voice class; the learner continues at their own pace.", parameters: {}, required: [] },
  {
    name: "open_workflow",
    description: "Open a workflow (e.g. invoice processing, insurance claims, KYC) in the current tab.",
    parameters: { name: str("Workflow name in the user's words") },
    required: ["name"],
  },
];

async function api(method, path, body) {
  if (dryRun && method !== "GET") {
    console.log(`[dry-run] ${method} ${path}`);
    return {};
  }
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { "xi-api-key": key, "Content-Type": "application/json" },
    body: body && JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${await res.text()}`);
  return res.json();
}

// Secciones "## First message" y "## System prompt" del markdown.
const doc = (await readFile(new URL("../docs/agent-prompt.md", import.meta.url), "utf8")).replace(/\r/g, "");
const section = (title) => doc.split(`\n## ${title}\n`)[1]?.split("\n## ")[0].trim();
const prompt = section("System prompt");
const firstMessage = section("First message");
if (!prompt || !firstMessage) throw new Error("docs/agent-prompt.md no tiene las secciones esperadas.");

const existing = new Map();
let cursor;
do {
  const page = await api("GET", `/tools${cursor ? `?cursor=${cursor}` : ""}`);
  for (const t of page.tools ?? []) existing.set(t.tool_config?.name, t.id);
  cursor = page.has_more ? page.next_cursor : null;
} while (cursor);

const toolIds = [];
for (const t of TOOLS) {
  const tool_config = {
    type: "client",
    name: t.name,
    description: t.description,
    parameters: { type: "object", properties: t.parameters, required: t.required },
    expects_response: true,
    response_timeout_secs: 20,
  };
  const id = existing.get(t.name);
  if (id) {
    await api("PATCH", `/tools/${id}`, { tool_config });
    toolIds.push(id);
    console.log(`tool ${t.name}: actualizada`);
  } else {
    const created = await api("POST", "/tools", { tool_config });
    toolIds.push(created.id);
    console.log(`tool ${t.name}: creada`);
  }
}

await api("PATCH", `/agents/${agentId}`, {
  conversation_config: {
    agent: {
      first_message: firstMessage,
      prompt: {
        prompt,
        tool_ids: toolIds,
        built_in_tools: { skip_turn: { type: "system", name: "skip_turn", description: "", params: { system_tool_type: "skip_turn" } } },
      },
    },
  },
});
console.log(`agente ${agentId}: prompt (${prompt.length} caracteres), primer mensaje y ${toolIds.length} tools aplicados`);
