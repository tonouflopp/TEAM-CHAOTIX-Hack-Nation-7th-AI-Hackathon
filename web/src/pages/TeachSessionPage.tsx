import { useParams } from "react-router-dom";
import { useApp } from "../AppContext";
import { ShieldIcon } from "../components/Icons";
import { MapSkeleton, SessionView } from "../components/SessionView";
import { Timeline } from "../components/Timeline";
import type { Session } from "../lib/api";
import { NotFound } from "./NotFound";

// Sesión del profesor: vídeo + transcripción filtrada, y el Work Map.
export function TeachSessionPage() {
  const { id } = useParams();
  const { mySessions, teachings } = useApp();
  // Propias (incluidas las no guardadas) o de la organización, abiertas desde la barra lateral.
  const teaching = teachings?.find((t) => t.id === id);
  const summary = mySessions?.find((s) => s.id === id) ?? teaching;

  if (mySessions === null || teachings === null) return <MapSkeleton />;
  if (!summary) return <NotFound back={{ to: "/teach", label: "Teach" }} />;

  return (
    <SessionView
      summary={summary}
      source={teaching?.source ?? "mine"}
      back={{ to: "/teach", label: "Teach" }}
      side={(session) => <Transcript session={session} />}
    />
  );
}

function Transcript({ session }: { session: Session | null }) {
  const items = session?.items ?? [];
  const redaction = items.some((i) => i.kind !== "gap" && i.redactedBy === "regex")
    ? "regex"
    : items.some((i) => i.kind !== "gap" && i.redactedBy === "presidio")
      ? "presidio"
      : null;

  return (
    <section aria-labelledby="transcript-title" className="max-h-[32rem] overflow-y-auto rounded-card bg-white p-5 shadow-soft ring-1 ring-line">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 id="transcript-title" className="text-lg font-semibold text-slate-900">
          Timeline and transcript
        </h2>
        {redaction && (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
              redaction === "presidio" ? "bg-emerald-50 text-emerald-800" : "bg-guard-tint text-guard"
            }`}
          >
            <ShieldIcon className="size-3.5" />
            {redaction === "presidio" ? "Filtered with Presidio" : "Basic filter only (Presidio was offline)"}
          </span>
        )}
      </div>
      {session ? <Timeline items={items} /> : <MapSkeleton />}
    </section>
  );
}
