import { createContext, useContext } from "react";
import type { CaptureSession } from "./hooks/useCaptureSession";
import type { AgentSession } from "./hooks/useAgentSession";
import type { SessionSummary } from "./lib/api";
import type { Stats, User, Workflow } from "./lib/mockData";
import type { Teaching } from "./lib/teachings";

export type AppContextValue = {
  user: User | null;
  signIn: () => void;
  agent: AgentSession;
  capture: CaptureSession;
  /** Inicia el flujo de grabación (aviso de privacidad la primera vez). Devuelve un texto para el agente. */
  requestRecording: (workflowId?: string | null) => Promise<string>;
  mySessions: SessionSummary[] | null; // null = cargando
  teachings: Teaching[] | null;
  workflows: Workflow[] | null;
  stats: Stats | null;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
};

export const AppContext = createContext<AppContextValue | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp fuera de AppContext");
  return ctx;
}
