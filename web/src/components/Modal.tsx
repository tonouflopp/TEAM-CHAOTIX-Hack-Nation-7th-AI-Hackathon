import { useEffect, useRef, type ReactNode } from "react";

type Props = { title: string; children: ReactNode; onClose: () => void; actions: ReactNode; icon?: ReactNode };

// Diálogo modal accesible: foco inicial en la acción principal y Escape para cerrar.
export function Modal({ title, children, onClose, actions, icon }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-midnight/50 p-0 sm:place-items-center sm:p-6" onClick={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-t-card bg-white p-6 shadow-soft sm:rounded-card sm:p-7"
      >
        {icon && <div className="mb-4 grid size-11 place-items-center rounded-xl bg-accent-tint text-accent">{icon}</div>}
        <h2 id="modal-title" className="text-lg font-semibold text-slate-900">
          {title}
        </h2>
        <div className="mt-3 text-sm leading-relaxed text-slate-700">{children}</div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{actions}</div>
      </div>
    </div>
  );
}

export const btn = {
  primary:
    "rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors duration-150 hover:bg-accent-strong disabled:opacity-60",
  secondary:
    "rounded-xl bg-white px-5 py-2.5 text-sm font-medium text-slate-800 ring-1 ring-line transition-colors duration-150 hover:ring-slate-400",
  danger:
    "rounded-xl bg-rec px-5 py-2.5 text-sm font-medium text-white transition-colors duration-150 hover:bg-red-700 disabled:opacity-60",
};
