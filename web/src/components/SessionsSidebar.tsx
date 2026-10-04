import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../AppContext";
import type { SessionSummary } from "../lib/api";
import { duration, plural, shortDate, sessionTitle } from "../lib/format";
import { CloseIcon, LockIcon, ScreenIcon } from "./Icons";
import { Thumb } from "./Thumb";

export type Tab = "teach" | "learn";
type Scope = "mine" | "org";

/** Ruta de una sesión según la pestaña: el profesor ve la transcripción; el alumno, el panel de Sage. */
export const sessionPath = (tab: Tab, id: string) => (tab === "teach" ? `/teach/sessions/${id}` : `/learn/teachings/${id}`);

export function SessionsSidebar({ tab, activeId }: { tab: Tab; activeId: string | null }) {
  const { sidebarOpen: open, setSidebarOpen } = useApp();
  const onClose = () => setSidebarOpen(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSidebarOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, setSidebarOpen]);

  return (
    <>
      {/* Escritorio: columna fija bajo el header */}
      <aside aria-label="Sessions" className="fixed bottom-0 left-0 top-16 hidden w-[300px] flex-col border-r border-line bg-white lg:flex">
        <SidebarBody tab={tab} activeId={activeId} />
      </aside>

      {/* Móvil y tablet: panel deslizante */}
      <div className={`fixed inset-0 top-16 z-30 lg:hidden ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
        <div onClick={onClose} className={`absolute inset-0 bg-midnight/40 transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0"}`} />
        <aside
          aria-label="Sessions"
          className={`absolute bottom-0 left-0 top-0 flex w-[min(320px,88vw)] flex-col bg-white shadow-soft transition-transform duration-200 ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <button
            onClick={onClose}
            aria-label="Close sessions"
            tabIndex={open ? 0 : -1}
            className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-500 hover:bg-paper hover:text-slate-900"
          >
            <CloseIcon />
          </button>
          {open && <SidebarBody tab={tab} activeId={activeId} />}
        </aside>
      </div>
    </>
  );
}

function SidebarBody({ tab, activeId }: { tab: Tab; activeId: string | null }) {
  const { user, signIn, mySessions, teachings, requestRecording, setSidebarOpen } = useApp();
  const navigate = useNavigate();
  const [scope, setScope] = useState<Scope>("mine");

  const mine = mySessions?.filter((s) => s.status === "saved") ?? null;
  const org = teachings?.filter((t) => t.source === "org") ?? null;
  const list: SessionSummary[] | null = scope === "mine" ? mine : org;

  const open = (id: string) => {
    setSidebarOpen(false);
    navigate(sessionPath(tab, id));
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="px-4 pb-3 pt-5">
        <h2 className="text-sm font-semibold text-slate-900">Sessions</h2>
        <div role="tablist" aria-label="Whose sessions" className="mt-3 grid grid-cols-2 rounded-xl bg-paper p-1 text-sm">
          {(["mine", "org"] as const).map((s) => (
            <button
              key={s}
              role="tab"
              aria-selected={scope === s}
              onClick={() => setScope(s)}
              className={`rounded-lg py-1.5 font-medium transition-colors duration-150 ${
                scope === s ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {s === "mine" ? "Mine" : "Organization"}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-6" role="tabpanel">
        {scope === "org" && !user ? (
          <Empty icon={<LockIcon className="size-6" />} text="Log in to see sessions recorded by your team." action="Log in" onAction={signIn} />
        ) : list === null ? (
          <SkeletonList />
        ) : list.length === 0 ? (
          <Empty
            icon={<ScreenIcon className="size-6" />}
            text={
              scope === "org"
                ? "Nobody in your organization has shared a session yet."
                : tab === "teach"
                  ? "No sessions yet. Record your first one to build a Work Map."
                  : "You haven't recorded any sessions yet."
            }
            action={scope === "mine" && tab === "teach" ? "Start recording" : undefined}
            onAction={() => requestRecording()}
          />
        ) : (
          <ul className="space-y-1">
            {list.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => open(s.id)}
                  aria-current={activeId === s.id ? "page" : undefined}
                  className={`flex w-full gap-3 rounded-xl p-2 text-left transition-colors duration-150 ${
                    activeId === s.id ? "bg-accent-tint" : "hover:bg-paper"
                  }`}
                >
                  <Thumb url={s.thumbnailUrl ?? null} />
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-sm font-medium ${activeId === s.id ? "text-accent-strong" : "text-slate-900"}`}>
                      {sessionTitle(s)}
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-600">
                      {shortDate(s.createdAt)}, {duration(s.durationMs)}
                      {s.owner && <>, {s.owner}</>}
                    </span>
                    <span className="mt-1 flex gap-2 text-xs text-slate-600">
                      <span>{plural(s.stepCount, "step")}</span>
                      <span>{plural(s.questionCount, "question")}</span>
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function SkeletonList() {
  return (
    <ul className="space-y-1 px-2" aria-label="Loading sessions">
      {[0, 1, 2, 3].map((i) => (
        <li key={i} className="flex animate-pulse gap-3 py-2">
          <span className="h-12 w-16 rounded-lg bg-slate-200" />
          <span className="flex-1 space-y-2 pt-1">
            <span className="block h-3 w-4/5 rounded bg-slate-200" />
            <span className="block h-2.5 w-1/2 rounded bg-slate-200" />
          </span>
        </li>
      ))}
    </ul>
  );
}

function Empty({ icon, text, action, onAction }: { icon: React.ReactNode; text: string; action?: string; onAction: () => void }) {
  return (
    <div className="mx-2 mt-2 flex flex-col items-center rounded-card border border-dashed border-line px-5 py-8 text-center">
      <span className="text-slate-400">{icon}</span>
      <p className="mt-3 text-sm text-slate-600">{text}</p>
      {action && (
        <button
          onClick={onAction}
          className="mt-4 rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-accent-strong"
        >
          {action}
        </button>
      )}
    </div>
  );
}
