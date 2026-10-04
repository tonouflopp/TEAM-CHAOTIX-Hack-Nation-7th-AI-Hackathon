import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useApp } from "../AppContext";
import { BookIcon, MicIcon, ShieldIcon } from "../components/Icons";
import { useToast } from "../components/Toasts";
import { VoiceWave } from "../components/VoiceWave";
import { plural, sessionTitle } from "../lib/format";
import { lessonPath, progress } from "../lib/lesson";
import type { Teaching } from "../lib/teachings";

// Frases de ejemplo: al pulsarlas se le dicen a Sage como si el alumno las hubiera dicho.
const TRY_SAYING = ["Teach me how to approve an invoice over budget", "I want a voice class on insurance claims", "Show me all the classes"];

// Inicio del alumno: no graba nada. Elige una clase y decide si la hace con Sage por voz o a su ritmo.
export function LearnHome() {
  const { teachings, workflows, agent } = useApp();
  const notify = useToast();
  const [asking, setAsking] = useState(false);
  const { hash } = useLocation();

  // open_teachings lleva a /learn#classes: se baja hasta el catálogo cuando ya está cargado.
  useEffect(() => {
    if (hash === "#classes" && teachings) document.getElementById("classes")?.scrollIntoView({ behavior: "smooth" });
  }, [hash, teachings]);

  async function say(text?: string) {
    setAsking(true);
    const ok = await agent.ensureConnected();
    setAsking(false);
    if (!ok) return notify("Sage isn't available right now. You can still open any class below.", "error");
    agent.prompt(text ?? "[ALUMNO] El alumno quiere aprender. Pregúntale qué quiere aprender hoy.");
  }

  const started = (teachings ?? [])
    .map((t) => ({ t, p: progress.of(t.id) }))
    .filter((x): x is { t: Teaching; p: NonNullable<typeof x.p> } => x.p !== null)
    .sort((a, b) => b.p.at - a.p.at);

  return (
    <div className="mx-auto max-w-6xl space-y-14 px-4 py-8 sm:px-6 sm:py-10 lg:px-10">
      {/* Hero: aprender hablando con Sage */}
      <section className="grid items-center gap-8 overflow-hidden rounded-[28px] bg-learn-deep p-6 text-white shadow-soft sm:p-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-teal-300">Learn</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">What do you want to learn today?</h1>
          <p className="mt-4 max-w-lg leading-relaxed text-teal-50/80">
            Tell Sage out loud. It opens the class and teaches it step by step, with the expert's reasons and the guardrails they never break.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => say()}
              disabled={asking}
              className="inline-flex items-center justify-center gap-2.5 rounded-xl bg-white px-6 py-3.5 font-semibold text-learn-strong transition-colors duration-150 hover:bg-teal-50 disabled:opacity-70"
            >
              <MicIcon className="size-5" />
              {asking ? "Connecting to Sage…" : agent.status === "connected" ? "Talk to Sage" : "Start talking to Sage"}
            </button>
            <a
              href="#classes"
              className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 font-medium text-white ring-1 ring-white/30 transition-colors duration-150 hover:bg-white/10"
            >
              <BookIcon className="size-5" /> Browse classes
            </a>
          </div>
          <div className="mt-7">
            <p className="text-xs font-medium text-teal-100/70">Try saying</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {TRY_SAYING.map((s) => (
                <li key={s}>
                  <button
                    onClick={() => say(s)}
                    className="rounded-full bg-white/10 px-3.5 py-1.5 text-left text-sm text-teal-50 transition-colors duration-150 hover:bg-white/20"
                  >
                    “{s}”
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="rounded-card bg-white/[0.04] p-4 ring-1 ring-white/10">
          <VoiceWave size="panel" className="h-24! lg:h-44!" />
          <p className="mt-2 text-center text-sm text-teal-50/70" aria-live="polite">
            {agent.status === "connected" ? (agent.isSpeaking ? "Sage is speaking" : "Sage is listening") : "Sage is offline"}
          </p>
        </div>
      </section>

      {/* Seguir aprendiendo */}
      {started.length > 0 && (
        <section aria-labelledby="continue-title">
          <h2 id="continue-title" className="text-xl font-semibold text-slate-900">
            Continue learning
          </h2>
          <ul className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            {started.slice(0, 4).map(({ t, p }) => {
              const pct = Math.round((p.seen.length / Math.max(1, p.total)) * 100);
              return (
                <li key={t.id} className="rounded-card bg-white p-5 shadow-soft ring-1 ring-line">
                  <p className="font-semibold text-slate-900">{sessionTitle(t)}</p>
                  <div className="mt-3 flex items-center gap-3">
                    <div
                      className="h-2 flex-1 overflow-hidden rounded-full bg-learn-tint"
                      role="progressbar"
                      aria-valuenow={pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label="Progress"
                    >
                      <div className="h-full rounded-full bg-learn" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-sm tabular-nums text-slate-600">
                      {p.seen.length}/{p.total} steps
                    </span>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Link to={lessonPath(t.id, true)} className={btnVoice}>
                      <MicIcon className="size-4" /> Resume with Sage
                    </Link>
                    <Link to={lessonPath(t.id)} className={btnRead}>
                      Resume reading
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Clases */}
      <section aria-labelledby="classes-title" id="classes" className="scroll-mt-24">
        <h2 id="classes-title" className="text-xl font-semibold text-slate-900">
          Classes from your organization's experts
        </h2>
        <p className="mt-1 text-sm text-slate-600">Each class is a real recording of an expert doing the task, turned into steps you can follow.</p>
        {teachings === null ? (
          <ul className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <li key={i} className="h-56 animate-pulse rounded-card bg-white ring-1 ring-line" />
            ))}
          </ul>
        ) : teachings.length === 0 ? (
          <p className="mt-5 rounded-card border border-dashed border-line bg-white px-6 py-10 text-center text-slate-600">
            No classes yet. They appear here when an expert saves a recorded session in Teach.
          </p>
        ) : (
          <ul className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {teachings.map((t) => (
              <li key={t.id} className="flex flex-col rounded-card bg-white p-5 shadow-soft ring-1 ring-line">
                {t.tags.length > 0 && (
                  <span className="flex flex-wrap gap-1.5">
                    {t.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="rounded-full bg-learn-tint px-2.5 py-0.5 text-xs font-medium text-learn-strong">
                        {tag}
                      </span>
                    ))}
                  </span>
                )}
                <h3 className="mt-3 font-semibold leading-snug text-slate-900">{sessionTitle(t)}</h3>
                <p className="mt-1 text-sm text-slate-600">Taught by {t.owner}</p>
                <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
                  <span>{plural(t.stepCount, "step")}</span>
                  <span className="inline-flex items-center gap-1">
                    <ShieldIcon className="size-3.5" /> {plural(t.questionCount, "expert insight")}
                  </span>
                </p>
                <div className="mt-auto flex gap-2 pt-5">
                  <Link to={lessonPath(t.id, true)} aria-label={`Voice class: ${sessionTitle(t)}`} className={`flex-1 ${btnVoice}`}>
                    <MicIcon className="size-4" /> Voice class
                  </Link>
                  <Link to={lessonPath(t.id)} aria-label={`Self-paced: ${sessionTitle(t)}`} className={`flex-1 ${btnRead}`}>
                    Self-paced
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Rutas por workflow */}
      <section aria-labelledby="paths-title" className="pb-8">
        <h2 id="paths-title" className="text-xl font-semibold text-slate-900">
          Learning paths
        </h2>
        <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(workflows ?? []).map((w) => {
            const count = (teachings ?? []).filter((t) => t.workflowId === w.id).length;
            return (
              <li key={w.id}>
                <Link
                  to={`/learn/workflows/${w.id}`}
                  className="flex items-center justify-between gap-4 rounded-card bg-white p-4 ring-1 ring-line transition-shadow duration-200 hover:ring-learn"
                >
                  <span className="min-w-0">
                    <span className="block font-medium text-slate-900">{w.name}</span>
                    <span className="block truncate text-sm text-slate-600">{w.description}</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-learn-tint px-2.5 py-1 text-xs font-medium text-learn-strong">
                    {count === 0 ? "Coming soon" : count === 1 ? "1 class" : `${count} classes`}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

export const btnVoice =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-learn px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-learn-strong";
export const btnRead =
  "inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium text-learn-strong ring-1 ring-learn/30 transition-colors duration-150 hover:bg-learn-tint";
