import { useEffect, useRef } from "react";
import { useConversationControls, useConversationInput, useConversationMode } from "@elevenlabs/react";
import { useApp } from "../AppContext";
import { MicIcon, MicOffIcon } from "./Icons";

type State = "offline" | "connecting" | "paused" | "speaking" | "listening";

const LABEL: Record<State, string> = {
  offline: "Sage offline",
  connecting: "Connecting…",
  paused: "Not listening",
  speaking: "Sage speaking",
  listening: "Listening",
};

// Botón global para que Sage deje de escuchar (silencia el micro) o vuelva a hacerlo.
// Mientras escucha, unas ondas salen del micro y crecen con la voz del usuario.
export function ListenButton() {
  const { agent } = useApp();
  const { isMuted, setMuted } = useConversationInput();
  const { isSpeaking } = useConversationMode();
  const state: State =
    agent.status === "connecting"
      ? "connecting"
      : agent.status !== "connected"
        ? "offline"
        : isMuted
          ? "paused"
          : isSpeaking
            ? "speaking"
            : "listening";

  const action =
    state === "offline" ? "Connect to Sage" : state === "paused" ? "Resume listening" : state === "connecting" ? "Connecting to Sage" : "Stop listening";

  function onClick() {
    if (state === "offline") agent.ensureConnected();
    else if (state !== "connecting") setMuted(!isMuted);
  }

  return (
    <button
      onClick={onClick}
      disabled={state === "connecting"}
      aria-label={action}
      title={action}
      className={`group mr-1.5 inline-flex shrink-0 items-center gap-2 rounded-full py-1 pl-1 pr-1 text-sm font-medium transition-colors duration-150 sm:mr-3 sm:pr-3.5 ${
        state === "listening" || state === "speaking"
          ? "bg-accent-tint text-accent-strong hover:bg-blue-100"
          : "bg-paper text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      <span className="relative grid size-8 place-items-center">
        {state === "listening" && <ListeningRings />}
        <span
          className={`relative grid size-8 place-items-center rounded-full transition-colors duration-200 ${
            state === "listening" || state === "speaking" ? "bg-accent text-white" : "bg-white text-slate-500 ring-1 ring-line"
          }`}
        >
          {state === "paused" || state === "offline" ? <MicOffIcon className="size-4" /> : <MicIcon className="size-4" />}
        </span>
      </span>
      <span className="hidden sm:inline" aria-live="polite">
        {LABEL[state]}
      </span>
    </button>
  );
}

// Ondas de escucha: dos anillos que se expanden en bucle y un halo que sigue el volumen del micro.
function ListeningRings() {
  const controls = useConversationControls();
  const halo = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    let level = 0;
    const tick = () => {
      const target = Math.min(1, controls.getInputVolume() * 2.5);
      level += (target - level) * (target > level ? 0.35 : 0.08);
      if (halo.current) halo.current.style.transform = `scale(${1 + level * 0.7})`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [controls]);

  return (
    <span aria-hidden className="pointer-events-none absolute inset-0">
      <span ref={halo} className="absolute inset-0 rounded-full bg-accent/25 transition-transform duration-75" />
      <span className="absolute inset-0 animate-listen rounded-full ring-2 ring-accent/60" />
      <span className="absolute inset-0 animate-listen rounded-full ring-2 ring-accent/60 [animation-delay:0.8s]" />
    </span>
  );
}
