import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CloseIcon } from "./Icons";

export type ToastTone = "info" | "success" | "error";
type Toast = { id: number; message: string; tone: ToastTone };

const ToastContext = createContext<(message: string, tone?: ToastTone) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = (id: number) => setToasts((t) => t.filter((x) => x.id !== id));

  const notify = useCallback((message: string, tone: ToastTone = "info") => {
    const id = nextId++;
    setToasts((t) => [...t.slice(-3), { id, message, tone }]);
    setTimeout(() => dismiss(id), tone === "error" ? 7000 : 4000);
  }, []);

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-6 sm:items-end"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tone === "error" ? "alert" : "status"}
            className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl bg-midnight px-4 py-3 text-sm text-white shadow-soft"
          >
            <span
              aria-hidden
              className={`mt-1.5 size-2 shrink-0 rounded-full ${t.tone === "success" ? "bg-emerald-400" : t.tone === "error" ? "bg-red-400" : "bg-sky-300"}`}
            />
            <p className="flex-1">{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
              className="-m-1 rounded p-1 text-slate-300 transition-colors duration-150 hover:text-white"
            >
              <CloseIcon className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
