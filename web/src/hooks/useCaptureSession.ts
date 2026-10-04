import { useEffect, useRef, useState } from "react";
import { useConversation } from "@elevenlabs/react";
import {
  analyzeFrame,
  deleteSession,
  saveItems,
  saveThumbnail,
  updateSessionMeta,
  type TimelineItem,
} from "../lib/api";
import { createFrameSampler } from "../lib/frameCapture";
import { PauseDetector, type PauseSignal } from "../lib/pauseDetector";
import { uploadRecording } from "../lib/placeholders";
import type { AgentSession } from "./useAgentSession";

// Fases de una grabación. "paused" muestra las opciones Continuar / Guardar / Eliminar.
export type CapturePhase = "idle" | "starting" | "recording" | "paused" | "processing";

type Notify = (message: string, tone?: "info" | "success" | "error") => void;

const sessionTitle = (d: Date) =>
  `Session on ${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })} at ${d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;

// La grabación usa la conversación compartida de la app (useAgentSession): no la abre ni la cierra.
export function useCaptureSession(notify: Notify, agent: AgentSession) {
  const [phase, setPhase] = useState<CapturePhase>("idle");
  const [offRecord, setOffRecord] = useState(false);
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [canAsk, setCanAsk] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const ids = useRef({ session: "", startedAt: 0, title: "" });
  const media = useRef<{
    screen: MediaStream;
    mic: MediaStream | null;
    recorder: MediaRecorder;
    chunks: Blob[];
    sampler: Awaited<ReturnType<typeof createFrameSampler>>;
  } | null>(null);
  const clock = useRef({ accumulated: 0, runningSince: 0 }); // tiempo grabado, sin pausas
  const flags = useRef({ phase: "idle" as CapturePhase, offRecord: false, frameInFlight: false, thumbnailSaved: false });
  const screenState = useRef("");
  const gapStart = useRef(0);

  const now = () => Date.now() - ids.current.startedAt;

  // Guarda en el server (que filtra con Presidio) y muestra la versión filtrada.
  const record = async (item: TimelineItem) => {
    if (flags.current.offRecord || !ids.current.session) return;
    try {
      const [redacted] = await saveItems(ids.current.session, [item]);
      setItems((prev) => [...prev, redacted]);
    } catch (err) {
      console.error("No se pudo guardar", err);
    }
  };

  useConversation({
    onMessage: ({ message, role }) => {
      if (!ids.current.session) return; // fuera de una grabación, la conversación no se guarda
      if (import.meta.env.DEV) console.debug(`[agent:${role}]`, message.slice(0, 80));
      if (role === "agent") {
        // El agente a veces imita las etiquetas de señal ("[PAUSA] ¿...?"): se quitan, no se descarta el mensaje.
        const text = message.replace(/^\s*(\[[^\]]*\]\s*)+/, "").trim();
        if (!text) return;
        const isQuestion = /[?¿]/.test(text);
        const aboutEvent = isQuestion ? detector.current.topic : null;
        if (isQuestion) detector.current.questionAsked();
        record({ kind: "transcript", t: now(), role: "agent", text, isQuestion, aboutEvent });
      } else {
        if (message.trim().startsWith("[")) return; // señales que enviamos nosotros
        record({ kind: "transcript", t: now(), role: "expert", text: message });
      }
    },
    onModeChange: ({ mode }) => detector.current.setAgentSpeaking(mode === "speaking"),
    onVadScore: ({ vadScore }) => detector.current.vadScore(vadScore),
    onDisconnect: () => {
      if (flags.current.phase === "recording") notify("The voice agent disconnected. Recording continues.", "error");
    },
  });

  const agentRef = useRef(agent);
  useEffect(() => {
    agentRef.current = agent;
  });

  const onSignal = (signal: PauseSignal) => {
    setCanAsk(signal.kind === "pause");
    // Las actualizaciones contextuales no provocan respuesta; para que el agente
    // pregunte en la pausa se envía como mensaje de usuario (dispara un turno).
    if (signal.kind === "pause") agentRef.current.prompt(signal.text);
    else agentRef.current.contextual(signal.text);
  };
  const [detectorInstance] = useState(() => new PauseDetector((s) => onSignal(s)));
  const detector = useRef(detectorInstance);

  const contextual = (text: string) => agentRef.current.contextual(text);

  // Reloj y detector de pausas mientras hay sesión.
  useEffect(() => {
    if (phase === "idle" || phase === "starting") return;
    const timer = setInterval(() => {
      const c = clock.current;
      setElapsedMs(c.accumulated + (c.runningSince ? Date.now() - c.runningSince : 0));
      detector.current.update();
    }, 250);
    return () => clearInterval(timer);
  }, [phase]);

  /** Activa o congela grabación, análisis y micrófono del agente según fase y "fuera de registro". */
  function applyActive() {
    const m = media.current;
    if (!m) return;
    const active = flags.current.phase === "recording" && !flags.current.offRecord;
    if (active && m.recorder.state === "paused") m.recorder.resume();
    if (!active && m.recorder.state === "recording") m.recorder.pause();
    m.sampler.setPaused(!active);
    if (agentRef.current.isConnected()) agentRef.current.setMuted(!active);
    detector.current.setPaused(!active);

    const c = clock.current;
    const counting = flags.current.phase === "recording"; // fuera de registro sigue contando: el hueco se ve en la línea de tiempo
    if (counting && !c.runningSince) c.runningSince = Date.now();
    if (!counting && c.runningSince) {
      c.accumulated += Date.now() - c.runningSince;
      c.runningSince = 0;
    }
  }

  function setPhaseBoth(next: CapturePhase) {
    flags.current.phase = next;
    setPhase(next);
  }

  async function start(workflowId: string | null = null): Promise<boolean> {
    if (flags.current.phase !== "idle") return false;
    setPhaseBoth("starting");
    setItems([]);
    setOffRecord(false);
    setElapsedMs(0);
    flags.current = { phase: "starting", offRecord: false, frameInFlight: false, thumbnailSaved: false };
    screenState.current = "";
    clock.current = { accumulated: 0, runningSince: 0 };

    let screen: MediaStream | null = null;
    let mic: MediaStream | null = null;
    try {
      screen = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 15 }, audio: false });
      mic = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => null);
      if (!mic) notify("Microphone blocked: the recording will have no audio and the agent can't hear you.", "error");

      const created = new Date();
      ids.current = {
        session: `s-${created.toISOString().replace(/[:.]/g, "-")}`,
        startedAt: Date.now(),
        title: sessionTitle(created),
      };
      setSessionId(ids.current.session);

      const tracks = [...screen.getVideoTracks(), ...(mic?.getAudioTracks() ?? [])];
      const mimeType = ["video/webm;codecs=vp9,opus", "video/webm"].find((t) => MediaRecorder.isTypeSupported(t));
      const recorder = new MediaRecorder(new MediaStream(tracks), mimeType ? { mimeType } : undefined);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      recorder.start(1000);

      const sampler = await createFrameSampler(screen, ids.current.startedAt, handleFrame);
      media.current = { screen, mic, recorder, chunks, sampler };

      // Si el usuario pulsa "Dejar de compartir" en el navegador, se pausa y se ofrece guardar.
      screen.getVideoTracks()[0].addEventListener("ended", () => {
        if (flags.current.phase === "recording") pause();
      });

      await updateSessionMeta(ids.current.session, { status: "recording", title: ids.current.title, workflowId });
      setPhaseBoth("recording");
      applyActive();
    } catch (err) {
      screen?.getTracks().forEach((t) => t.stop());
      mic?.getTracks().forEach((t) => t.stop());
      media.current = null;
      setPhaseBoth("idle");
      const denied = err instanceof DOMException && err.name === "NotAllowedError";
      notify(denied ? "Screen sharing was cancelled." : `Couldn't start recording: ${err}`, "error");
      return false;
    }

    // El agente de voz es opcional: si no conecta, se sigue grabando sin preguntas.
    agentRef.current.ensureConnected().then((ok) => {
      if (!ok) return notify("The voice agent isn't connected. Recording continues without questions.", "error");
      contextual("[GRABACIÓN INICIADA] Ahora eres el aprendiz: observa y pregunta solo tras [PAUSA].");
      applyActive();
    });
    return true;
  }

  async function handleFrame(frame: { imageBase64: string; t: number }) {
    const f = flags.current;
    if (f.offRecord || f.phase !== "recording" || f.frameInFlight) return;
    if (!f.thumbnailSaved) {
      f.thumbnailSaved = true;
      const thumb = media.current?.sampler.blurredThumbnail();
      if (thumb) saveThumbnail(ids.current.session, thumb).catch(() => (f.thumbnailSaved = false));
    }
    f.frameInFlight = true;
    try {
      const res = await analyzeFrame({ sessionId: ids.current.session, prevState: screenState.current, ...frame });
      if (flags.current.offRecord) return;
      screenState.current = res.screenState;
      for (const event of res.events) {
        record({ kind: "screen", ...event });
        detector.current.screenEvent(event.summary);
        contextual(`[PANTALLA] ${event.summary}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      f.frameInFlight = false;
    }
  }

  function pause() {
    if (flags.current.phase !== "recording") return;
    setPhaseBoth("paused");
    applyActive();
    contextual("[NO INTERRUMPIR] Grabación en pausa.");
  }

  function resume() {
    if (flags.current.phase !== "paused") return;
    if (media.current?.screen.getVideoTracks()[0].readyState === "ended") {
      notify("Screen sharing ended. Save or delete this recording.", "error");
      return;
    }
    setPhaseBoth("recording");
    applyActive();
  }

  function toggleOffRecord() {
    const next = !flags.current.offRecord;
    if (next) {
      gapStart.current = now();
      setItems((prev) => [...prev, { kind: "gap", t: gapStart.current, until: null }]);
      contextual("[FUERA DE REGISTRO] El experto pidió no registrar. No preguntes nada.");
      flags.current.offRecord = true;
    } else {
      flags.current.offRecord = false;
      closeGap();
      contextual("[REGISTRO REANUDADO]");
    }
    setOffRecord(next);
    applyActive();
  }

  function closeGap() {
    const gap: TimelineItem = { kind: "gap", t: gapStart.current, until: now() };
    setItems((prev) => prev.map((it) => (it.kind === "gap" && it.until === null ? gap : it)));
    saveItems(ids.current.session, [gap]).catch(() => {});
  }

  /** Detiene todo y devuelve el vídeo grabado. */
  async function teardown(): Promise<Blob | null> {
    const m = media.current;
    media.current = null;
    ids.current.session = ""; // deja de guardar la conversación
    setCanAsk(false);
    detector.current.setPaused(true);
    if (agentRef.current.isConnected()) agentRef.current.setMuted(false);
    contextual("[GRABACIÓN TERMINADA] Vuelves a ser la guía de Sage.");
    if (!m) return null;
    m.sampler.stop();
    const stopped = new Promise<void>((resolve) => (m.recorder.onstop = () => resolve()));
    if (m.recorder.state !== "inactive") m.recorder.stop();
    else m.recorder.onstop?.(new Event("stop"));
    await stopped;
    m.screen.getTracks().forEach((t) => t.stop());
    m.mic?.getTracks().forEach((t) => t.stop());
    return new Blob(m.chunks, { type: m.recorder.mimeType || "video/webm" });
  }

  async function save(): Promise<string | null> {
    if (flags.current.phase !== "paused" && flags.current.phase !== "recording") return null;
    if (flags.current.offRecord) {
      flags.current.offRecord = false;
      setOffRecord(false);
      closeGap();
    }
    const c = clock.current;
    const durationMs = c.accumulated + (c.runningSince ? Date.now() - c.runningSince : 0);
    setPhaseBoth("processing");
    const id = ids.current.session;
    setItems([]);
    try {
      const video = await teardown();
      if (video) await uploadRecording(id, video);
      await updateSessionMeta(id, { status: "saved", durationMs });
      notify("Session saved", "success");
      return id;
    } catch (err) {
      notify(`Couldn't save the session: ${err}`, "error");
      return null;
    } finally {
      setPhaseBoth("idle");
      setSessionId(null);
    }
  }

  async function discard() {
    const id = ids.current.session;
    setPhaseBoth("processing");
    await teardown();
    try {
      await deleteSession(id);
      notify("Recording deleted", "success");
    } catch (err) {
      notify(`Couldn't delete the recording: ${err}`, "error");
    }
    setPhaseBoth("idle");
    setSessionId(null);
    setItems([]);
  }

  return {
    phase,
    sessionId,
    elapsedMs,
    offRecord,
    items,
    canAsk,
    start,
    pause,
    resume,
    toggleOffRecord,
    save,
    discard,
  };
}

export type CaptureSession = ReturnType<typeof useCaptureSession>;
