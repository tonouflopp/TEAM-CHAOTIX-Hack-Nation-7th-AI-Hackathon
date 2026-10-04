import { Link, useNavigate } from "react-router-dom";
import { useApp } from "../AppContext";
import { MapIcon, QuestionIcon, ScreenIcon, ShieldIcon, TeachIcon } from "../components/Icons";
import { PageIntro } from "../components/PageIntro";
import { sessionPath, type Tab } from "../components/SessionsSidebar";
import { Thumb } from "../components/Thumb";
import { Timeline } from "../components/Timeline";
import type { SessionSummary } from "../lib/api";
import { duration, plural, shortDate, sessionTitle } from "../lib/format";
import type { Workflow } from "../lib/mockData";

const STATUS: Record<Workflow["status"], { label: string; className: string }> = {
  mapped: { label: "Mapped", className: "bg-emerald-50 text-emerald-800" },
  "in-review": { label: "In review", className: "bg-accent-tint text-accent-strong" },
  draft: { label: "Draft", className: "bg-slate-100 text-slate-700" },
  "needs-recording": { label: "Needs a recording", className: "bg-guard-tint text-guard" },
};

const LEAD: Record<Tab, string> = {
  teach:
    "Record your screen while you work. Sage asks why you made each decision and turns the answers into a workflow new hires can learn from.",
  learn: "Learn your organization's workflows from the experts who do them, with the reasons and guardrails behind every decision.",
};

// Interfaz común de Teach y Learn. Teach graba; Learn abre las enseñanzas de la organización.
export function TabHome({ tab }: { tab: Tab }) {
  const { capture, requestRecording, mySessions, teachings, workflows, stats } = useApp();
  const navigate = useNavigate();
  const recording = capture.phase !== "idle";

  const recent: SessionSummary[] | null =
    tab === "teach" ? (mySessions?.filter((s) => s.status === "saved") ?? null) : teachings;

  function exploreMap() {
    const pool = tab === "teach" ? [...(recent ?? []), ...(teachings ?? [])] : (teachings ?? []);
    const target = pool.find((s) => s.stepCount > 0) ?? pool[0];
    if (target) navigate(sessionPath(tab, target.id));
  }

  return (
    <div className="mx-auto max-w-6xl space-y-14 sm:space-y-16">
      {/* Hero */}
      <section className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div>
          <PageIntro title={tab === "teach" ? "Teach" : "Learn"} />
          <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">{LEAD[tab]}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {tab === "teach" ? (
              <button
                onClick={() => requestRecording()}
                disabled={recording}
                className="inline-flex items-center justify-center gap-2.5 rounded-xl bg-accent px-6 py-3.5 font-medium text-white shadow-soft transition-colors duration-150 hover:bg-accent-strong disabled:opacity-60"
              >
                <span aria-hidden className="size-2.5 rounded-full bg-white" />
                {recording ? "Recording in progress" : "Start recording"}
              </button>
            ) : (
              <Link
                to="/learn/teachings"
                className="inline-flex items-center justify-center rounded-xl bg-accent px-6 py-3.5 font-medium text-white shadow-soft transition-colors duration-150 hover:bg-accent-strong"
              >
                Your organization's teachings
              </Link>
            )}
            <button
              onClick={exploreMap}
              className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3.5 font-medium text-midnight ring-1 ring-line transition-colors duration-150 hover:text-accent hover:ring-accent"
            >
              Explore the Work Map
            </button>
          </div>
        </div>
        <HeroMap />
      </section>

      {tab === "teach" && recording && <LiveSession />}

      {/* Módulos */}
      <section aria-labelledby="modules-title">
        <h2 id="modules-title" className="text-xl font-semibold text-slate-900">
          How it works
        </h2>
        <ol className="mt-5 grid gap-4 md:grid-cols-3">
          {[
            { icon: <ScreenIcon />, title: "Capture", text: "Record your screen while you work. Sage asks why at natural pauses, never mid-task." },
            { icon: <MapIcon />, title: "Map", text: "A clickable Work Map of steps, decisions, reasons and guardrails." },
            { icon: <TeachIcon />, title: "Teach", text: "A voice tutor that coaches new hires through the workflow, with the expert's reasoning." },
          ].map((m, i) => (
            <li key={m.title} className="rounded-card bg-white p-6 shadow-soft ring-1 ring-line">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-accent-tint text-accent">{m.icon}</span>
                <h3 className="font-semibold text-slate-900">
                  <span className="sr-only">Step {i + 1}: </span>
                  {m.title}
                </h3>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{m.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Métricas */}
      <section aria-labelledby="stats-title">
        <h2 id="stats-title" className="text-xl font-semibold text-slate-900">
          Your organization so far
        </h2>
        <dl className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: "Sessions recorded", value: stats?.sessions },
            { label: "Steps mapped", value: stats?.steps },
            { label: "Guardrails captured", value: stats?.guardrails },
            { label: "New hires trained", value: stats?.hires },
          ].map((s) => (
            <div key={s.label} className="rounded-card bg-white p-5 shadow-soft ring-1 ring-line">
              <dt className="text-sm text-slate-600">{s.label}</dt>
              <dd className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-midnight">
                {s.value ?? <span className="inline-block h-8 w-14 animate-pulse rounded bg-slate-200" aria-label="Loading" />}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Workflows */}
      <section aria-labelledby="workflows-title">
        <h2 id="workflows-title" className="text-xl font-semibold text-slate-900">
          Workflows
        </h2>
        <ul className="mt-5 grid gap-4 sm:grid-cols-2">
          {workflows === null
            ? [0, 1, 2, 3].map((i) => <li key={i} className="h-36 animate-pulse rounded-card bg-white ring-1 ring-line" />)
            : workflows.map((w) => (
                <li key={w.id} className="flex flex-col rounded-card bg-white p-5 shadow-soft ring-1 ring-line">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold text-slate-900">{w.name}</h3>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS[w.status].className}`}>
                      {STATUS[w.status].label}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm text-slate-600">{w.description}</p>
                  <div className="mt-auto flex items-center justify-between pt-4">
                    <span className="text-xs text-slate-600">
                      {plural(w.sessions, "session")}, {plural(w.steps, "step")}
                    </span>
                    <Link
                      to={`/${tab}/workflows/${w.id}`}
                      aria-label={`Open ${w.name}`}
                      className="rounded-lg px-3.5 py-1.5 text-sm font-medium text-accent ring-1 ring-accent/40 transition-colors duration-150 hover:bg-accent hover:text-white"
                    >
                      Open
                    </Link>
                  </div>
                </li>
              ))}
        </ul>
      </section>

      {/* Sesiones recientes */}
      <section aria-labelledby="recent-title" className="pb-8">
        <h2 id="recent-title" className="text-xl font-semibold text-slate-900">
          {tab === "teach" ? "Your recent sessions" : "Recent teachings"}
        </h2>
        {recent === null ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-44 animate-pulse rounded-card bg-white ring-1 ring-line" />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <div className="mt-5 rounded-card border border-dashed border-line bg-white px-6 py-10 text-center">
            <p className="text-slate-700">{tab === "teach" ? "No sessions yet." : "No teachings yet."}</p>
            <p className="mt-1 text-sm text-slate-600">
              {tab === "teach"
                ? "Record a task you know well. Ten minutes is enough for a first Work Map."
                : "Teachings appear here when a teacher saves a recorded session."}
            </p>
          </div>
        ) : (
          <ul className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recent.slice(0, 6).map((s) => (
              <li key={s.id}>
                <Link
                  to={sessionPath(tab, s.id)}
                  className="block overflow-hidden rounded-card bg-white shadow-soft ring-1 ring-line transition-shadow duration-200 hover:ring-accent"
                >
                  <Thumb url={s.thumbnailUrl ?? null} className={`${s.thumbnailUrl ? "aspect-video" : "h-24"} w-full rounded-none`} />
                  <span className="block p-4">
                    <span className="block truncate font-medium text-slate-900">{sessionTitle(s)}</span>
                    <span className="mt-1 block text-xs text-slate-600">
                      {shortDate(s.createdAt)}, {duration(s.durationMs)}
                      {s.owner ? `, ${s.owner}` : `, ${plural(s.questionCount, "question")}`}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// Fragmento de un Work Map de ejemplo junto al título de la pestaña.
function HeroMap() {
  return (
    <figure aria-label="Example Work Map" className="rounded-card bg-white p-5 shadow-soft ring-1 ring-line sm:p-6">
      <figcaption className="mb-4 flex items-center justify-between text-sm">
        <span className="font-semibold text-slate-900">Invoice processing</span>
        <span className="text-slate-600">Work Map</span>
      </figcaption>
      <ol className="space-y-3 text-sm">
        <li className="flex gap-3">
          <span className="grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold text-midnight ring-2 ring-midnight">1</span>
          <span className="pt-1 text-slate-800">Match the invoice to its purchase order</span>
        </li>
        <li className="flex gap-3">
          <span className="grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold text-midnight ring-2 ring-midnight">2</span>
          <div className="min-w-0 flex-1 space-y-2">
            <span className="block pt-1 text-slate-800">Approve invoice 1042</span>
            <p className="flex gap-2 rounded-xl bg-accent-tint px-3 py-2 text-slate-800">
              <QuestionIcon className="mt-0.5 size-4 shrink-0 text-accent" />
              Why approve it when it's over budget?
            </p>
            <p className="rounded-xl px-3 py-1 text-slate-600">It's inside the 10% tolerance and the delivery note matches.</p>
            <p className="flex gap-2 rounded-xl bg-guard-tint px-3 py-2 text-guard ring-1 ring-amber-300">
              <ShieldIcon className="mt-0.5 size-4 shrink-0" />
              Over €5,000 or 10% above the PO: get the finance lead's sign-off first.
            </p>
          </div>
        </li>
      </ol>
    </figure>
  );
}

// Durante la grabación: estado de Sage y línea de tiempo con sus preguntas.
function LiveSession() {
  const { capture, agent } = useApp();
  const { canAsk, items, offRecord } = capture;
  const questions = items.filter((i) => i.kind === "transcript" && i.isQuestion).length;
  const agentLabel =
    agent.status === "connected" ? (agent.isSpeaking ? "Speaking" : "Listening") : agent.status === "connecting" ? "Connecting…" : "Not connected";

  return (
    <section aria-labelledby="live-title" className="rounded-card bg-white p-5 shadow-soft ring-1 ring-line sm:p-6">
      <h2 id="live-title" className="font-semibold text-slate-900">
        Live session
      </h2>
      <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
        <div className="rounded-xl bg-paper p-3">
          <dt className="text-slate-600">Sage</dt>
          <dd className="mt-1 font-semibold text-slate-900">{agentLabel}</dd>
        </div>
        <div className="rounded-xl bg-paper p-3">
          <dt className="text-slate-600">Can ask now</dt>
          <dd className="mt-1 font-semibold text-slate-900">
            {offRecord ? "Off the record" : agent.status !== "connected" ? "Not connected" : canAsk ? "Yes, natural pause" : "No, you're busy"}
          </dd>
        </div>
        <div className="rounded-xl bg-paper p-3">
          <dt className="text-slate-600">Questions</dt>
          <dd className="mt-1 font-semibold tabular-nums text-slate-900">{questions}</dd>
        </div>
      </dl>
      <div className="mt-5">
        <Timeline items={items} live />
      </div>
    </section>
  );
}
