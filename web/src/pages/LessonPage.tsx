import { useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useApp } from "../AppContext";
import { BackIcon, BookIcon, CheckIcon, ChevronIcon, MicIcon, MicOffIcon, ShieldIcon } from "../components/Icons";
import { videoUrl, thumbnailUrl } from "../lib/api";
import { useToast } from "../components/Toasts";
import { VoiceWave } from "../components/VoiceWave";
import { plural, sessionTitle } from "../lib/format";
import { classroom, lessonBriefing, progress, useClassroom, type Lesson } from "../lib/lesson";
import { loadLesson } from "../lib/placeholders";
import type { Teaching } from "../lib/teachings";
import { NotFound } from "./NotFound";

// Clase del alumno: un paso cada vez, con dos modos. "Voice class": Sage la imparte y mueve
// los pasos con show_step. "Self-paced": el alumno avanza solo.
export function LessonPage() {
  const { id } = useParams();
  const { teachings } = useApp();
  const teaching = teachings?.find((t) => t.id === id);

  if (teachings === null) return <LessonSkeleton />;
  if (!teaching) return <NotFound back={{ to: "/learn", label: "Learn" }} />;
  return <Lesson key={teaching.id} teaching={teaching} />;
}

function Lesson({ teaching }: { teaching: Teaching }) {
  const { agent } = useApp();
  const notify = useToast();
  const [params, setParams] = useSearchParams();
  const [lesson, setLesson] = useState<Lesson | null | undefined>(undefined);
  const [connecting, setConnecting] = useState(false);
  const [muted, setMuted] = useState(false);
  const room = useClassroom();
  const active = room.lessonId === teaching.id;
  const step = active ? room.step : 0;
  const voice = active && room.voice;
  const wantsVoice = useRef(params.get("mode") === "voice");

  useEffect(() => {
    let cancelled = false;
    loadLesson(teaching)
      .then(({ lesson }) => {
        if (cancelled) return;
        setLesson(lesson);
        if (lesson) classroom.open(teaching.id, lesson);
      })
      .catch(() => !cancelled && setLesson(null));
    return () => {
      cancelled = true;
    };
  }, [teaching]);

  // ?mode=voice desde un botón "Voice class": la clase empieza sola (el clic ya fue el gesto del usuario).
  // Si la abrió el propio agente con start_class, ya tiene el Work Map y no hace falta.
  useEffect(() => {
    if (!lesson || !wantsVoice.current) return;
    wantsVoice.current = false;
    setParams({}, { replace: true });
    if (!classroom.get().voice) startClass();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson]);

  // Al salir de la página la clase termina (sin provocar que Sage hable).
  useEffect(
    () => () => {
      if (classroom.get().voice && classroom.get().lessonId === teaching.id) {
        classroom.setVoice(false);
        agent.contextual("[CLASE TERMINADA] El alumno salió de la clase.");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [teaching.id],
  );

  async function startClass() {
    if (!lesson) return;
    setConnecting(true);
    const ok = await agent.ensureConnected();
    setConnecting(false);
    if (!ok) return notify("Couldn't connect to Sage. You can keep going at your own pace.", "error");
    classroom.setVoice(true);
    agent.contextual(lessonBriefing(lesson));
    agent.prompt(`[LECCIÓN] Empieza la clase de "${lesson.title}" en el paso ${classroom.get().step + 1}. Llama a show_step en cada paso.`);
  }

  function endClass() {
    classroom.setVoice(false);
    if (muted) toggleMute();
    agent.prompt("[CLASE TERMINADA] El alumno pasó a modo autónomo. Despídete en una frase corta.");
  }

  function toggleMute() {
    agent.setMuted(!muted);
    setMuted(!muted);
  }

  function goTo(i: number) {
    if (!lesson) return;
    classroom.goTo(i);
    if (voice) agent.prompt(`[LECCIÓN] El alumno abrió el paso ${i + 1}: "${lesson.steps[i].title}". Explícalo.`);
  }

  function finish() {
    if (!lesson) return;
    classroom.goTo(lesson.steps.length - 1);
    if (voice) agent.prompt("[LECCIÓN] El alumno terminó el último paso. Repasa los guardrails en dos frases y despídete.");
    else notify("Class complete. Nice work!", "success");
  }

  const seen = progress.of(teaching.id)?.seen ?? [];
  const current = lesson?.steps[step];
  const guardrails = lesson?.steps.reduce((n, s) => n + s.questions.filter((q) => q.isGuardrail).length, 0) ?? 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-10">
      <Link
        to="/learn"
        className="-ml-2 mb-4 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-slate-600 transition-colors duration-150 hover:text-learn"
      >
        <BackIcon className="size-4" /> Learn
      </Link>

      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-learn">Class</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">{sessionTitle(teaching)}</h1>
          <p className="mt-1 text-sm text-slate-600">
            Taught by {teaching.owner}
            {lesson && (
              <>
                {" "}
                · {plural(lesson.steps.length, "step")} · <span className="text-guard">{plural(guardrails, "guardrail")}</span>
              </>
            )}
          </p>
        </div>

        <div role="radiogroup" aria-label="How do you want to take this class?" className="grid grid-cols-2 rounded-xl bg-learn-tint p-1 text-sm">
          <button
            role="radio"
            aria-checked={voice}
            onClick={() => !voice && startClass()}
            disabled={!lesson || connecting}
            className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 font-medium transition-colors duration-150 ${
              voice ? "bg-learn text-white shadow-sm" : "text-learn-strong hover:bg-white/60"
            }`}
          >
            <MicIcon className="size-4" /> {connecting ? "Connecting…" : "Voice class"}
          </button>
          <button
            role="radio"
            aria-checked={!voice}
            onClick={() => voice && endClass()}
            className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 font-medium transition-colors duration-150 ${
              !voice ? "bg-white text-learn-strong shadow-sm" : "text-learn-strong hover:bg-white/60"
            }`}
          >
            <BookIcon className="size-4" /> Self-paced
          </button>
        </div>
      </div>

      {lesson === undefined ? (
        <LessonSkeleton />
      ) : lesson === null || !current ? (
        <p className="mt-8 rounded-card border border-dashed border-line bg-white px-6 py-10 text-center text-slate-600">
          This class has no steps yet. Steps appear when the expert's recording shows changes on screen.
        </p>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          {/* Índice de la clase */}
          <nav aria-label="Class steps" className="order-2 lg:order-1">
            <ol className="space-y-1">
              {lesson.steps.map((s, i) => {
                const isCurrent = i === step;
                const done = seen.includes(i) && !isCurrent;
                return (
                  <li key={s.id}>
                    <button
                      onClick={() => goTo(i)}
                      aria-current={isCurrent ? "step" : undefined}
                      className={`flex w-full items-start gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors duration-150 ${
                        isCurrent ? "bg-learn-tint" : "hover:bg-paper"
                      }`}
                    >
                      <span
                        className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold ${
                          isCurrent ? "bg-learn text-white" : done ? "bg-learn-tint text-learn" : "text-slate-600 ring-1 ring-line"
                        }`}
                      >
                        {done ? <CheckIcon className="size-3.5" /> : i + 1}
                      </span>
                      <span className={`pt-0.5 ${isCurrent ? "font-medium text-learn-strong" : "text-slate-700"}`}>{s.title}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>

          <div className="order-1 space-y-5 lg:order-2">
            {voice && (
              <section aria-label="Voice class" className="flex flex-col gap-4 rounded-card bg-learn-deep p-5 text-white sm:flex-row sm:items-center">
                <VoiceWave size="panel" className="h-20! sm:flex-1" />
                <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                  <p className="text-sm text-teal-50/80" aria-live="polite">
                    {agent.status !== "connected" ? "Reconnecting…" : agent.isSpeaking ? "Sage is teaching" : muted ? "Mic muted" : "Sage is listening"}
                  </p>
                  <div className="ml-auto flex gap-2">
                    <button
                      onClick={toggleMute}
                      aria-pressed={muted}
                      aria-label={muted ? "Unmute microphone" : "Mute microphone"}
                      className="grid size-10 place-items-center rounded-full bg-white/10 transition-colors duration-150 hover:bg-white/20"
                    >
                      {muted ? <MicOffIcon /> : <MicIcon />}
                    </button>
                    <button
                      onClick={endClass}
                      className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-learn-strong transition-colors duration-150 hover:bg-teal-50"
                    >
                      End class
                    </button>
                  </div>
                </div>
              </section>
            )}

            <article aria-labelledby="step-title" className="rounded-card bg-white p-6 shadow-soft ring-1 ring-line sm:p-8">
              <div className="flex items-center gap-3">
                <p className="text-sm font-medium text-learn">
                  Step {step + 1} of {lesson.steps.length}
                </p>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-learn-tint" aria-hidden>
                  <div className="h-full rounded-full bg-learn transition-[width] duration-300" style={{ width: `${((step + 1) / lesson.steps.length) * 100}%` }} />
                </div>
              </div>
              <h2 id="step-title" className="mt-4 text-xl font-semibold text-slate-900 sm:text-2xl">
                {current.title}
              </h2>
              {current.change && <p className="mt-2 text-slate-700">{current.change}</p>}

              <div className="mt-6 space-y-3">
                {current.questions.map((q, k) =>
                  q.isGuardrail ? (
                    <div key={k} className="rounded-xl bg-guard-tint p-4 ring-1 ring-amber-300">
                      <p className="flex items-center gap-2 text-sm font-semibold text-guard">
                        <ShieldIcon className="size-4" /> Guardrail
                      </p>
                      <p className="mt-1.5 text-slate-900">{q.answer ?? q.question}</p>
                    </div>
                  ) : (
                    <div key={k} className="rounded-xl bg-paper p-4">
                      <p className="text-sm font-semibold text-learn-strong">Why the expert does this</p>
                      <p className="mt-1 text-sm text-slate-600">{q.question}</p>
                      <p className="mt-1.5 text-slate-900">{q.answer ?? <span className="text-slate-500">No answer recorded.</span>}</p>
                    </div>
                  ),
                )}
                {current.notes.map((note, k) => (
                  <p key={k} className="border-l-2 border-learn/40 pl-3 text-slate-700">
                    {note}
                  </p>
                ))}
                {!current.change && current.questions.length === 0 && current.notes.length === 0 && (
                  <p className="text-sm text-slate-600">
                    The expert didn't explain this step{teaching.hasVideo ? ". Watch the recording below to see it." : "; it's a routine action."}
                  </p>
                )}
              </div>

              <div className="mt-8 flex items-center justify-between gap-3">
                <button
                  onClick={() => goTo(step - 1)}
                  disabled={step === 0}
                  className="inline-flex items-center gap-1 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 ring-1 ring-line transition-colors duration-150 hover:bg-paper disabled:opacity-40"
                >
                  <BackIcon className="size-4" /> Previous
                </button>
                {step < lesson.steps.length - 1 ? (
                  <button
                    onClick={() => goTo(step + 1)}
                    className="inline-flex items-center gap-1 rounded-xl bg-learn px-5 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-learn-strong"
                  >
                    Next step <ChevronIcon className="size-4" />
                  </button>
                ) : (
                  <button
                    onClick={finish}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-learn px-5 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-learn-strong"
                  >
                    <CheckIcon className="size-4" /> Finish class
                  </button>
                )}
              </div>
            </article>

            {(teaching.hasVideo || teaching.hasThumbnail) && (
              <details className="group rounded-card bg-white shadow-soft ring-1 ring-line">
                <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 font-medium text-slate-900">
                  Watch the expert do it
                  <ChevronIcon className="size-4 text-slate-400 transition-transform duration-200 group-open:rotate-90" />
                </summary>
                {teaching.hasVideo ? (
                  <video
                    src={videoUrl(teaching.id)}
                    poster={teaching.hasThumbnail ? thumbnailUrl(teaching.id) : undefined}
                    controls
                    preload="none"
                    className="block aspect-video w-full rounded-b-card bg-black"
                  />
                ) : (
                  <img src={thumbnailUrl(teaching.id)} alt="Blurred preview of the expert's screen" className="aspect-video w-full rounded-b-card object-cover" />
                )}
              </details>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function LessonSkeleton() {
  return (
    <div className="mt-8 grid animate-pulse gap-6 lg:grid-cols-[260px_minmax(0,1fr)]" aria-label="Loading class">
      <div className="space-y-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-9 rounded-xl bg-slate-100" />
        ))}
      </div>
      <div className="h-80 rounded-card bg-slate-100" />
    </div>
  );
}
