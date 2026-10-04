import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { getSession, thumbnailUrl, type Session, type SessionSummary } from "../lib/api";
import { duration, longDate, plural, sessionTitle } from "../lib/format";
import { fetchOrgSession, generateWorkMap, localRecordingUrl } from "../lib/placeholders";
import type { WorkMap } from "../lib/workMap";
import { BackIcon, ScreenIcon } from "./Icons";
import { WorkMapView } from "./WorkMapView";

type Props = {
  summary: SessionSummary;
  source: "org" | "mine";
  back: { to: string; label: string };
  /** Panel a la derecha del vídeo (transcripción para el profesor, "Learn this with Sage" para el alumno). */
  side: (session: Session | null) => ReactNode;
};

// Misma estructura para profesor y alumno: vídeo + panel lateral, y debajo el Work Map clicable.
export function SessionView({ summary, source, back, side }: Props) {
  const [state, setState] = useState<{ id: string; session: Session | null; map: WorkMap | null; error?: string } | null>(null);
  const loaded = state?.id === summary.id ? state : null;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const session = source === "org" ? await fetchOrgSession(summary.id) : await getSession(summary.id);
        const map = session ? await generateWorkMap(session) : null;
        if (!cancelled) setState({ id: summary.id, session, map });
      } catch (err) {
        if (!cancelled) setState({ id: summary.id, session: null, map: null, error: String(err) });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [summary.id, source]);

  const video = localRecordingUrl(summary.id);

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        to={back.to}
        className="-ml-2 mb-4 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-slate-600 transition-colors duration-150 hover:text-accent"
      >
        <BackIcon className="size-4" /> {back.label}
      </Link>

      <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">{sessionTitle(summary)}</h1>
      <p className="mt-1 text-sm text-slate-600">
        {longDate(summary.createdAt)}, {duration(summary.durationMs)}
        {summary.owner && <>, taught by {summary.owner}</>}
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section aria-label="Session video" className="overflow-hidden rounded-card bg-white shadow-soft ring-1 ring-line">
          {video ? (
            <video src={video} controls className="aspect-video w-full bg-black" />
          ) : summary.hasThumbnail ? (
            <img src={thumbnailUrl(summary.id)} alt="Blurred preview of the recorded screen" className="aspect-video w-full object-cover" />
          ) : (
            <div className="grid aspect-video w-full place-items-center bg-slate-50 text-slate-400">
              <ScreenIcon className="size-8" />
            </div>
          )}
          <p className="px-4 py-3 text-xs text-slate-600">
            {video
              ? "Playing the recording saved in this browser. It hasn't been uploaded."
              : summary.hasThumbnail
                ? "Preview is blurred so nothing on screen can be read."
                : "The video for this session isn't available on this device."}
          </p>
        </section>
        {side(loaded?.session ?? null)}
      </div>

      <section aria-labelledby="map-title" className="mt-6 rounded-card bg-white p-5 shadow-soft ring-1 ring-line sm:p-6">
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="map-title" className="text-lg font-semibold text-slate-900">
            Work Map
          </h2>
          {loaded?.map && (
            <p className="text-sm text-slate-600">
              {plural(loaded.map.reasonCount, "reason")},{" "}
              <span className="font-medium text-guard">{plural(loaded.map.guardrailCount, "guardrail")}</span>
            </p>
          )}
        </div>
        {!loaded ? <MapSkeleton /> : loaded.map ? <WorkMapView map={loaded.map} /> : <LoadError error={loaded.error} />}
        <p className="mt-4 text-xs text-slate-500">Select a step to see the decision, its reasons and guardrails.</p>
      </section>
    </div>
  );
}

export function MapSkeleton() {
  return (
    <div className="animate-pulse space-y-4" aria-label="Loading">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex gap-4">
          <span className="size-8 rounded-full bg-slate-200" />
          <span className="flex-1 space-y-2 pt-1">
            <span className="block h-3.5 w-3/4 rounded bg-slate-200" />
            <span className="block h-3 w-1/3 rounded bg-slate-200" />
          </span>
        </div>
      ))}
    </div>
  );
}

function LoadError({ error }: { error?: string }) {
  return (
    <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
      This session couldn't be loaded{error ? `: ${error}` : "."} Check that the server is running and try again.
    </p>
  );
}
