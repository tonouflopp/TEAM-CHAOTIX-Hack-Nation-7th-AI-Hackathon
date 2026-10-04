import type { Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { describe, forClass, loadKnowledge, search } from "./guardrails.js";

// Servidor MCP (Streamable HTTP, sin estado) para que el tutor de ElevenLabs consulte los guardrails
// de los expertos. Sin estado: cada petición crea su servidor, así funciona igual en una función de Vercel.

function build() {
  const server = new McpServer({ name: "sage-guardrails", version: "1.0.0" });

  server.registerTool(
    "search_guardrails",
    {
      title: "Search the experts' guardrails",
      description:
        "Find the rules experts follow for a situation: limits, exceptions and when to stop and ask someone. " +
        "Call it before the learner takes a decision (approve, reject, code, route, pay...) or when they ask what the rule is. " +
        "Returns each rule in the expert's own words with its class, step and screen moment.",
      inputSchema: {
        query: z.string().describe("The situation in English, e.g. 'approve invoice 7200 euros over PO' or 'route small water damage claim'"),
        include_reasons: z.boolean().optional().describe("Also return the expert's reasons for decisions (default false)"),
        limit: z.number().int().min(1).max(10).optional().describe("Maximum results (default 5)"),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ query, include_reasons, limit }) => {
      const found = search(await loadKnowledge(), query, { includeReasons: include_reasons ?? false, limit: limit ?? 5 });
      const text = found.length
        ? found.map(describe).join("\n\n")
        : `No guardrail matches "${query}". Don't invent one: tell the learner the expert didn't cover this case and suggest asking their lead.`;
      return { content: [{ type: "text", text }] };
    },
  );

  server.registerTool(
    "get_class_guardrails",
    {
      title: "All guardrails of a class",
      description: "Every guardrail and reason the expert gave in one class, in step order. Use it when a class starts or to review before the learner finishes.",
      inputSchema: { class_topic: z.string().describe("Class title or topic, e.g. 'invoice over budget', 'KYC'") },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ class_topic }) => {
      const items = forClass(await loadKnowledge(), class_topic);
      const text = items?.length
        ? `${items.length === 1 ? "1 entry" : `${items.length} entries`} for "${items[0].classTitle}" by ${items[0].expert}:\n\n${items.map(describe).join("\n\n")}`
        : `No class matches "${class_topic}".`;
      return { content: [{ type: "text", text }] };
    },
  );

  return server;
}

/** POST /api/mcp. Con MCP_TOKEN definido exige "Authorization: Bearer <token>" (en Vercel es obligatorio). */
export async function handleMcp(req: Request, res: Response) {
  const token = process.env.MCP_TOKEN;
  if (!token && process.env.VERCEL) return res.status(503).json({ error: "MCP_TOKEN no configurado" });
  if (token && req.headers.authorization?.replace(/^Bearer\s+/i, "") !== token) return res.status(401).json({ error: "unauthorized" });

  const server = build();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  res.on("close", () => {
    transport.close();
    server.close();
  });
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error("[mcp]", err);
    if (!res.headersSent) res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Internal error" }, id: null });
  }
}
