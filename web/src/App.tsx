import { useEffect, useRef, useState } from "react";
import { useConversation } from "@elevenlabs/react";
import { analyzeFrame, getSignedUrl, saveItems, type TimelineItem } from "./lib/api";
import { startScreenCapture } from "./lib/frameCapture";
import { PauseDetector, type PauseSignal } from "./lib/pauseDetector";

export default function App() {
  const [running, setRunning] = useState(false);
  const [offRecord, setOffRecord] = useState(false);
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [canAsk, setCanAsk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sessionLabel, setSessionLabel] = useState("");
  const sessionId = useRef("");
  const startedAt = useRef(0);
  const capture = useRef<{ stop: () => void } | null>(null);
  const screenState = useRef(""); // último estado conocido de la pantalla (lo devuelve Claude)
  const frameInFlight = useRef(false);
  const offRecordRef = useRef(false);
  const gapStart = useRef(0);

  const now = () => Date.now() - startedAt.current;

  // Añade a la UI y persiste, salvo en modo "fuera de registro".
  const record = (item: TimelineItem) => {
    if (offRecordRef.current) return;
    setItems((prev) => [...prev, item]);
    saveItems(sessionId.current, [item]);
  };

  const conversation = useConversation({
    onMessage: ({ message, role }) => {
      if (message.startsWith("[")) return; // señales internas, no son transcripción
      if (role === "agent") {
        const isQuestion = message.includes("?");
        const aboutEvent = isQuestion ? detector.current.topic : null;
        if (isQuestion) detector.current.questionAsked();
        record({ kind: "transcript", t: now(), role: "agent", text: message, isQuestion, aboutEvent });
      } else {
        record({ kind: "transcript", t: now(), role: "expert", text: message });
      }
    },
    onModeChange: ({ mode }) => detector.current.setAgentSpeaking(mode === "speaking"),
    onVadScore: ({ vadScore }) => detector.current.vadScore(vadScore),
    onError: (message) => setError(String(message)),
    onDisconnect: () => stop(),
  });

  const convRef = useRef(conversation);
  useEffect(() => {
    convRef.current = conversation;
  });

  const onSignal = (signal: PauseSignal) => {
    setCanAsk(signal.kind === "pause");
    // Las actualizaciones contextuales no provocan respuesta; para que el agente
    // pregunte en la pausa se envía como mensaje de usuario (dispara un turno).
    if (signal.kind === "pause") convRef.current.sendUserMessage(signal.text);
    else convRef.current.sendContextualUpdate(signal.text);
  };
  const [detectorInstance] = useState(() => new PauseDetector((s) => onSignal(s)));
  const detector = useRef(detectorInstance);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => detector.current.update(), 500);
    return () => clearInterval(timer);
  }, [running]);

  async function start() {
    setError(null);
    setItems([]);
    sessionId.current = `s-${new Date().toISOString().replace(/[:.]/g, "-")}`;
    screenState.current = "";
    setSessionLabel(sessionId.current);
    try {
      const cap = await startScreenCapture(handleFrame, stop);
      capture.current = cap;
      startedAt.current = cap.startedAt;
      const signedUrl = await getSignedUrl();
      conversation.startSession({ signedUrl });
      setRunning(true);
    } catch (err) {
      capture.current?.stop();
      setError(String(err));
    }
  }

  function stop() {
    capture.current?.stop();
    capture.current = null;
    if (convRef.current.status !== "disconnected") convRef.current.endSession();
    setRunning(false);
    setCanAsk(false);
  }

  async function handleFrame(frame: { imageBase64: string; t: number }) {
    // Fuera de registro no se analiza nada; si Claude aún procesa el frame anterior, se omite este.
    if (offRecordRef.current || frameInFlight.current) return;
    frameInFlight.current = true;
    try {
      const res = await analyzeFrame({ sessionId: sessionId.current, prevState: screenState.current, ...frame });
      if (offRecordRef.current) return;
      screenState.current = res.screenState;
      for (const event of res.events) {
        record({ kind: "screen", ...event });
        detector.current.screenEvent(event.summary);
        convRef.current.sendContextualUpdate(`[PANTALLA] ${event.summary}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      frameInFlight.current = false;
    }
  }

  function toggleOffRecord() {
    const next = !offRecordRef.current;
    if (next) {
      gapStart.current = now();
      setItems((prev) => [...prev, { kind: "gap", t: gapStart.current, until: null }]);
      convRef.current.sendContextualUpdate("[FUERA DE REGISTRO] El experto pidió no registrar. No preguntes nada.");
      offRecordRef.current = true;
    } else {
      offRecordRef.current = false;
      const gap: TimelineItem = { kind: "gap", t: gapStart.current, until: now() };
      setItems((prev) => prev.map((it) => (it.kind === "gap" && it.until === null ? gap : it)));
      saveItems(sessionId.current, [gap]);
      convRef.current.sendContextualUpdate("[REGISTRO REANUDADO]");
    }
    conversation.setMuted(next); // el agente tampoco escucha mientras no se registra
    detector.current.setPaused(next);
    setOffRecord(next);
  }

  const agentState =
    conversation.status !== "connected" ? conversation.status : conversation.isSpeaking ? "hablando" : "escuchando";

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100">
      <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
        <h1 className="text-3xl font-semibold">AI Apprentice · Captura</h1>
        <p className="max-w-md text-center text-slate-400">
          Comparte tu pantalla y trabaja con normalidad. El aprendiz observará y hará preguntas breves en las pausas.
        </p>
        <div className="flex gap-3">
          {!running ? (
            <button onClick={start} className="rounded-lg bg-emerald-600 px-6 py-3 font-medium hover:bg-emerald-500">
              Iniciar sesión
            </button>
          ) : (
            <>
              <button onClick={stop} className="rounded-lg bg-slate-700 px-6 py-3 font-medium hover:bg-slate-600">
                Terminar
              </button>
              <button
                onClick={toggleOffRecord}
                className={`rounded-lg px-6 py-3 font-medium ${offRecord ? "bg-red-600 hover:bg-red-500" : "bg-amber-600 hover:bg-amber-500"}`}
              >
                {offRecord ? "● Fuera de registro (reanudar)" : "Fuera de registro"}
              </button>
            </>
          )}
        </div>
        {error && <p className="max-w-lg text-sm text-red-400">{error}</p>}
        {running && <p className="text-xs text-slate-500">Sesión {sessionLabel}</p>}
      </main>

      <aside className="flex w-[420px] flex-col border-l border-slate-800 bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-800 p-4">
          <span className="text-sm">
            Agente: <b className={agentState === "hablando" ? "text-sky-400" : "text-emerald-400"}>{agentState}</b>
          </span>
          <span className={`rounded px-2 py-0.5 text-xs ${canAsk ? "bg-sky-700" : "bg-slate-700"}`}>
            {canAsk ? "puede preguntar" : "no interrumpir"}
          </span>
        </div>
        <ol className="flex-1 space-y-2 overflow-y-auto p-4 text-sm">
          {items.map((item, i) => (
            <li key={i}>
              <TimelineRow item={item} />
            </li>
          ))}
        </ol>
      </aside>
    </div>
  );
}

function TimelineRow({ item }: { item: TimelineItem }) {
  const time = <span className="mr-2 font-mono text-xs text-slate-500">{fmt(item.t)}</span>;
  if (item.kind === "gap")
    return (
      <div className="rounded border border-dashed border-red-700 p-2 text-red-300">
        {time}Fuera de registro {item.until === null ? "(en curso)" : `hasta ${fmt(item.until)}`}
      </div>
    );
  if (item.kind === "screen")
    return (
      <div className="rounded bg-slate-800 p-2">
        {time}
        <span className="mr-1 text-xs uppercase text-amber-400">{item.type}</span>
        {item.summary}
      </div>
    );
  return (
    <div className={`rounded p-2 ${item.role === "agent" ? "bg-sky-950" : "bg-emerald-950"}`}>
      {time}
      <b>{item.role === "agent" ? "Aprendiz" : "Experto"}:</b> {item.text}
      {item.isQuestion && item.aboutEvent && <div className="mt-1 text-xs text-slate-400">↳ sobre: {item.aboutEvent}</div>}
    </div>
  );
}

function fmt(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
