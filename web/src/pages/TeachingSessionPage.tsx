import { useState } from "react";
import { useParams } from "react-router-dom";
import { useApp } from "../AppContext";
import { useToast } from "../components/Toasts";
import { MapSkeleton, SessionView } from "../components/SessionView";
import { VoiceWave } from "../components/VoiceWave";
import { startTutorSession } from "../lib/placeholders";
import { NotFound } from "./NotFound";

export function TeachingSessionPage() {
  const { id } = useParams();
  const { teachings } = useApp();
  const teaching = teachings?.find((t) => t.id === id);

  if (teachings === null) return <MapSkeleton />;
  if (!teaching) return <NotFound back={{ to: "/learn/teachings", label: "teachings" }} />;

  return (
    <SessionView
      summary={teaching}
      source={teaching.source}
      back={{ to: "/learn/teachings", label: "Teachings" }}
      side={() => <LearnPanel sessionId={teaching.id} />}
    />
  );
}

function LearnPanel({ sessionId }: { sessionId: string }) {
  const { agent } = useApp();
  const notify = useToast();
  const [state, setState] = useState<{ id: string; phase: "starting" | "active" } | null>(null);
  const phase = state?.id === sessionId ? state.phase : "idle";

  async function startLesson() {
    setState({ id: sessionId, phase: "starting" });
    try {
      const [lesson, connected] = await Promise.all([startTutorSession(sessionId), agent.ensureConnected()]);
      if (!connected) throw new Error("the voice agent isn't connected");
      agent.contextual(lesson.briefing);
      agent.prompt(lesson.kickoff);
      setState({ id: sessionId, phase: "active" });
    } catch (err) {
      setState(null);
      notify(`Couldn't start the lesson: ${err instanceof Error ? err.message : err}`, "error");
    }
  }

  return (
    <section
      aria-labelledby="learn-title"
      className="flex flex-col rounded-card bg-white p-5 shadow-soft ring-2 ring-accent/25 sm:p-6"
    >
      <h2 id="learn-title" className="text-lg font-semibold text-slate-900">
        Learn this with Sage
      </h2>
      <VoiceWave size="panel" className="my-4" />
      <button
        onClick={startLesson}
        disabled={phase !== "idle"}
        className="mt-auto rounded-xl bg-accent px-6 py-3.5 text-base font-semibold text-white shadow-soft transition-colors duration-150 hover:bg-accent-strong disabled:opacity-70"
      >
        {phase === "starting" ? "Starting lesson…" : phase === "active" ? "Lesson in progress" : "Start lesson"}
      </button>
    </section>
  );
}
