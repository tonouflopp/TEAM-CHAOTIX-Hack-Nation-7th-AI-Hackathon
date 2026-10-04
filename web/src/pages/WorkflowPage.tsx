import { Link, useParams } from "react-router-dom";
import { useApp } from "../AppContext";
import { BackIcon } from "../components/Icons";
import { sessionPath, type Tab } from "../components/SessionsSidebar";
import { Thumb } from "../components/Thumb";
import { duration, plural, shortDate, sessionTitle } from "../lib/format";

export function WorkflowPage({ tab }: { tab: Tab }) {
  const { id } = useParams();
  const { workflows, teachings, capture, requestRecording } = useApp();
  const workflow = workflows?.find((w) => w.id === id);
  const sessions = (teachings ?? []).filter((s) => s.workflowId === id);
  const back = (
    <Link
      to={`/${tab}`}
      className="-ml-2 mb-4 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-slate-600 transition-colors duration-150 hover:text-accent"
    >
      <BackIcon className="size-4" /> {tab === "teach" ? "Teach" : "Learn"}
    </Link>
  );

  if (workflows === null) return <div className="mx-auto h-40 max-w-4xl animate-pulse rounded-card bg-white ring-1 ring-line" />;
  if (!workflow)
    return (
      <div className="mx-auto max-w-4xl">
        {back}
        <p className="text-slate-700">This workflow doesn't exist.</p>
      </div>
    );

  return (
    <div className="mx-auto max-w-4xl">
      {back}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">{workflow.name}</h1>
          <p className="mt-1 text-slate-600">{workflow.description}</p>
        </div>
        {tab === "teach" && (
          <button
            onClick={() => requestRecording(workflow.id)}
            disabled={capture.phase !== "idle"}
            className="shrink-0 rounded-xl bg-accent px-5 py-3 font-medium text-white transition-colors duration-150 hover:bg-accent-strong disabled:opacity-60"
          >
            Record this workflow
          </button>
        )}
      </div>

      {sessions.length === 0 ? (
        <div className="mt-8 rounded-card border border-dashed border-line bg-white px-6 py-10 text-center">
          <p className="text-slate-700">No sessions for this workflow yet.</p>
          <p className="mt-1 text-sm text-slate-600">
            {tab === "teach" ? "Record one run of the task to create its first Work Map." : "It will appear here once a teacher records it."}
          </p>
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {sessions.map((s) => (
            <li key={s.id}>
              <Link
                to={sessionPath(tab, s.id)}
                className="flex w-full items-center gap-4 rounded-card bg-white p-3 text-left shadow-soft ring-1 ring-line transition-shadow duration-200 hover:ring-accent"
              >
                <Thumb url={s.thumbnailUrl ?? null} className="h-16 w-24" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-slate-900">{sessionTitle(s)}</span>
                  <span className="mt-1 block text-sm text-slate-600">
                    {shortDate(s.createdAt)}, {duration(s.durationMs)}, {s.owner}
                  </span>
                </span>
                <span className="hidden text-sm text-slate-600 sm:block">
                  {plural(s.stepCount, "step")}, {plural(s.questionCount, "question")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
