import { Link } from "react-router-dom";
import { useApp } from "../AppContext";
import { BackIcon } from "../components/Icons";
import { shortDate, sessionTitle } from "../lib/format";

export function TeachingsPage() {
  const { teachings } = useApp();

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        to="/learn"
        className="-ml-2 mb-4 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-slate-600 transition-colors duration-150 hover:text-accent"
      >
        <BackIcon className="size-4" /> Learn
      </Link>
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Your organization's teachings</h1>

      {teachings === null ? (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2" aria-label="Loading teachings">
          {[0, 1, 2, 3].map((i) => (
            <li key={i} className="h-32 animate-pulse rounded-card bg-white ring-1 ring-line" />
          ))}
        </ul>
      ) : teachings.length === 0 ? (
        <p className="mt-6 rounded-card border border-dashed border-line bg-white px-6 py-8 text-center text-sm text-slate-600">
          No teachings yet. They appear here when a teacher saves a recorded session.
        </p>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {teachings.map((t) => (
            <li key={t.id}>
              <Link
                to={`/learn/teachings/${t.id}`}
                className="flex h-full flex-col rounded-card bg-white p-5 shadow-soft ring-1 ring-line transition-shadow duration-200 hover:ring-accent"
              >
                <span className="font-semibold text-slate-900">{sessionTitle(t)}</span>
                <span className="mt-1 text-sm text-slate-600">
                  {t.owner}, {shortDate(t.createdAt)}
                </span>
                {t.tags.length > 0 && (
                  <span className="mt-auto flex flex-wrap gap-1.5 pt-4">
                    {t.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-accent-tint px-2.5 py-0.5 text-xs font-medium text-accent-strong">
                        {tag}
                      </span>
                    ))}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
