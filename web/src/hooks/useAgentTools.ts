import { useConversationClientTool } from "@elevenlabs/react";
import { useLocation, useNavigate } from "react-router-dom";
import { findTeaching, type Teaching } from "../lib/teachings";

// Herramientas de cliente que el agente puede llamar para controlar la UI.
// Deben existir con el mismo nombre y parámetros en el dashboard de ElevenLabs.
// Los parámetros llegan del modelo sin tipar: se validan aquí.
const PAGES: Record<string, string> = { home: "/", teach: "/teach", learn: "/learn" };

export function useAgentTools(opts: { requestRecording: () => Promise<string>; teachings: Teaching[] | null }) {
  const navigate = useNavigate();
  const location = useLocation();

  useConversationClientTool("navigate", (params) => {
    const page = String(params.page ?? "").toLowerCase();
    const path = Object.hasOwn(PAGES, page) ? PAGES[page] : undefined;
    if (!path) return `Unknown page "${page}". Use home, teach or learn.`;
    navigate(path);
    return `Opened the ${page} page.`;
  });

  useConversationClientTool("start_recording", async () => {
    if (location.pathname !== "/teach") navigate("/teach");
    return opts.requestRecording();
  });

  useConversationClientTool("open_teachings", () => {
    navigate("/learn/teachings");
    return "Opened the organization's teachings.";
  });

  useConversationClientTool("open_session", (params) => {
    const topic = String(params.topic ?? "");
    const list = opts.teachings ?? [];
    const match = findTeaching(list, topic);
    if (!match) {
      const titles = list.map((t) => t.title).filter(Boolean).join("; ");
      return `No session matches "${topic}". Available sessions: ${titles || "none yet"}.`;
    }
    navigate(`/learn/teachings/${match.id}`);
    return `Opened "${match.title}" by ${match.owner}.`;
  });
}
