import { useEffect, useRef } from "react";
import { useConversation } from "@elevenlabs/react";
import { getSignedUrl } from "../lib/placeholders";

type Notify = (message: string, tone?: "info" | "success" | "error") => void;

// ¿El navegador deja reproducir audio sin un gesto del usuario? (política de autoplay)
function audioAllowed() {
  try {
    const ctx = new AudioContext();
    const ok = ctx.state === "running";
    ctx.close();
    return ok;
  } catch {
    return false;
  }
}

/**
 * Una sola conversación con el agente para toda la app.
 * Arranca al cargar; si el navegador bloquea el audio, en el primer clic o tecla.
 */
export function useAgentSession(notify: Notify) {
  const conversation = useConversation({
    onError: (message) => notify(`Voice agent: ${message}`, "error"),
  });

  const status = useRef(conversation.status);
  const starting = useRef(false);
  const failures = useRef(0);
  const waiters = useRef<((ok: boolean) => void)[]>([]);

  useEffect(() => {
    status.current = conversation.status;
    if (conversation.status === "connected") {
      failures.current = 0;
      waiters.current.splice(0).forEach((resolve) => resolve(true));
    }
    if (conversation.status === "error" || conversation.status === "disconnected") {
      if (!starting.current) waiters.current.splice(0).forEach((resolve) => resolve(false));
    }
  }, [conversation.status]);

  async function connect() {
    if (status.current === "connected" || status.current === "connecting" || starting.current) return;
    starting.current = true;
    try {
      conversation.startSession({ signedUrl: await getSignedUrl() });
    } catch (err) {
      // Solo se avisa del primer fallo; los reintentos con el siguiente clic son silenciosos.
      if (++failures.current === 1) notify(`Couldn't reach the voice agent: ${err}`, "error");
      waiters.current.splice(0).forEach((resolve) => resolve(false));
    } finally {
      starting.current = false;
    }
  }

  /** Conecta si hace falta y espera a que la conversación esté lista. */
  function ensureConnected(): Promise<boolean> {
    if (status.current === "connected") return Promise.resolve(true);
    const ready = new Promise<boolean>((resolve) => waiters.current.push(resolve));
    connect();
    return ready;
  }

  useEffect(() => {
    if (audioAllowed()) connect();
    // Sin UI extra: el primer gesto en cualquier parte inicia (o recupera) la conversación.
    const onGesture = () => {
      if (status.current === "disconnected" && failures.current < 2) connect();
    };
    window.addEventListener("pointerdown", onGesture, true);
    window.addEventListener("keydown", onGesture, true);
    return () => {
      window.removeEventListener("pointerdown", onGesture, true);
      window.removeEventListener("keydown", onGesture, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Envía una actualización contextual solo si hay conversación (no provoca respuesta). */
  function contextual(text: string) {
    if (status.current === "connected") conversation.sendContextualUpdate(text);
  }

  /** Envía un mensaje que sí provoca un turno del agente. */
  function prompt(text: string) {
    if (status.current === "connected") conversation.sendUserMessage(text);
  }

  return {
    status: conversation.status,
    isSpeaking: conversation.isSpeaking,
    setMuted: conversation.setMuted,
    ensureConnected,
    contextual,
    prompt,
    isConnected: () => status.current === "connected",
  };
}

export type AgentSession = ReturnType<typeof useAgentSession>;
