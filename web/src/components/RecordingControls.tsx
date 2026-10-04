import { useState } from "react";
import { createPortal } from "react-dom";
import type { CaptureSession } from "../hooks/useCaptureSession";
import { FLOATING_SIZES } from "../hooks/useFloatingWindow";
import { clock } from "../lib/format";
import { EyeOffIcon, PauseIcon, PlayIcon, StopIcon } from "./Icons";

type Actions = { onSave: () => void; onDelete: () => void };

// ── Barra de grabación (dentro de la página, bajo el header) ────────────────
export function RecordingBar({
  capture,
  onSave,
  onRequestDelete,
  canPopOut,
  onPopOut,
  onShowLive,
  className = "",
}: {
  capture: CaptureSession;
  onRequestDelete: () => void;
  canPopOut: boolean;
  onPopOut: () => void;
  onShowLive?: () => void;
  className?: string;
} & Pick<Actions, "onSave">) {
  const { phase, elapsedMs, offRecord } = capture;
  const paused = phase === "paused";
  const processing = phase === "processing";

  return (
    <div
      role="region"
      aria-label="Recording controls"
      className={`sticky top-16 z-20 border-b border-line bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85 ${className}`}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 sm:px-6">
        <div className="flex items-center gap-2.5">
          <StatusDot phase={phase} offRecord={offRecord} />
          <span className="font-semibold tabular-nums text-slate-900" aria-label={`Elapsed ${clock(elapsedMs)}`}>
            {clock(elapsedMs)}
          </span>
          <span className="text-sm text-slate-600">{statusText(phase, offRecord)}</span>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {processing ? null : paused ? (
            <>
              <BarButton onClick={capture.resume} icon={<PlayIcon className="size-4" />}>
                Continue
              </BarButton>
              <BarButton onClick={onSave} tone="primary">
                Save
              </BarButton>
              <BarButton onClick={onRequestDelete} tone="danger">
                Delete
              </BarButton>
            </>
          ) : (
            <>
              <BarButton onClick={capture.toggleOffRecord} pressed={offRecord} icon={<EyeOffIcon className="size-4" />}>
                {offRecord ? "Back on the record" : "Off the record"}
              </BarButton>
              <BarButton onClick={capture.pause} icon={<PauseIcon className="size-4" />}>
                Pause
              </BarButton>
              <BarButton onClick={capture.pause} icon={<StopIcon className="size-4" />} label="Stop and choose to save or delete">
                Stop
              </BarButton>
            </>
          )}
          {onShowLive && (
            <button onClick={onShowLive} className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-accent hover:bg-accent-tint">
              View live timeline
            </button>
          )}
          {canPopOut && !processing && (
            <button onClick={onPopOut} className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-accent hover:bg-accent-tint">
              Pop out widget
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function BarButton({
  children,
  onClick,
  icon,
  tone = "neutral",
  pressed,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  icon?: React.ReactNode;
  tone?: "neutral" | "primary" | "danger";
  pressed?: boolean;
  label?: string;
}) {
  const tones = {
    neutral: pressed
      ? "bg-midnight text-white ring-midnight"
      : "bg-white text-slate-800 ring-line hover:text-accent hover:ring-accent",
    primary: "bg-accent text-white ring-accent hover:bg-accent-strong",
    danger: "bg-white text-rec ring-red-200 hover:bg-red-50",
  };
  return (
    <button
      onClick={onClick}
      aria-pressed={pressed}
      aria-label={label}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium ring-1 transition-colors duration-150 ${tones[tone]}`}
    >
      {icon}
      {children}
    </button>
  );
}

function StatusDot({ phase, offRecord }: { phase: CaptureSession["phase"]; offRecord: boolean }) {
  const live = phase === "recording" && !offRecord;
  return (
    <span
      aria-hidden
      className={`size-3 rounded-full ${live ? "animate-rec bg-rec" : phase === "processing" ? "animate-pulse bg-accent" : "bg-slate-400"}`}
    />
  );
}

function statusText(phase: CaptureSession["phase"], offRecord: boolean) {
  if (phase === "starting") return "Starting…";
  if (phase === "processing") return "Processing…";
  if (phase === "paused") return "Paused. Continue, save or delete.";
  if (offRecord) return "Paused: not being analyzed";
  return "Recording";
}

// ── Widget flotante (Document PiP o, si no hay soporte, dentro de la página) ─
export function FloatingWidget({
  capture,
  pipWindow,
  pipSupported,
  onSave,
  onDelete,
}: { capture: CaptureSession; pipWindow: Window | null; pipSupported: boolean } & Actions) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { phase, elapsedMs, offRecord } = capture;

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    setConfirmDelete(false);
    if (pipWindow) {
      const size = next ? FLOATING_SIZES.expanded : FLOATING_SIZES.collapsed;
      try {
        pipWindow.resizeTo(size.width, size.height);
      } catch {
        /* algunos navegadores no permiten redimensionar: el contenido hace scroll */
      }
    }
  };

  const circle = (
    <button
      onClick={toggle}
      aria-expanded={expanded}
      aria-label={`${statusText(phase, offRecord).replace(/\.$/, "")}, ${clock(elapsedMs)}. ${expanded ? "Hide" : "Show"} recording controls`}
      className="grid size-[76px] shrink-0 place-items-center rounded-full bg-midnight text-white shadow-soft ring-2 ring-white/15 transition-colors duration-150 hover:ring-accent"
    >
      <span className="flex flex-col items-center gap-1">
        <StatusDot phase={phase} offRecord={offRecord} />
        <span className="text-xs font-semibold tabular-nums">{clock(elapsedMs)}</span>
      </span>
    </button>
  );

  const panel = expanded && (
    <div className="w-[268px] rounded-card bg-white p-4 text-slate-900 shadow-soft ring-1 ring-line">
      <p className="text-sm font-semibold">{statusText(phase, offRecord)}</p>
      {phase === "processing" ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-slate-600">
          <span className="size-4 animate-spin rounded-full border-2 border-accent border-t-transparent" aria-hidden /> Saving your session…
        </p>
      ) : phase === "paused" ? (
        confirmDelete ? (
          <div className="mt-3">
            <p className="text-sm text-slate-700">Delete this recording? This can't be undone.</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button onClick={() => setConfirmDelete(false)} className="rounded-lg py-2 text-sm font-medium ring-1 ring-line hover:ring-slate-400">
                Keep it
              </button>
              <button onClick={onDelete} className="rounded-lg bg-rec py-2 text-sm font-medium text-white hover:bg-red-700">
                Delete
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-3 grid gap-2">
            <button onClick={capture.resume} className="rounded-lg py-2 text-sm font-medium ring-1 ring-line hover:text-accent hover:ring-accent">
              Continue
            </button>
            <button onClick={onSave} className="rounded-lg bg-accent py-2 text-sm font-medium text-white hover:bg-accent-strong">
              Save
            </button>
            <button onClick={() => setConfirmDelete(true)} className="rounded-lg py-2 text-sm font-medium text-rec ring-1 ring-red-200 hover:bg-red-50">
              Delete
            </button>
          </div>
        )
      ) : (
        <div className="mt-3 grid gap-2">
          <button
            onClick={capture.pause}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium ring-1 ring-line hover:text-accent hover:ring-accent"
          >
            <PauseIcon className="size-4" /> Pause
          </button>
          <button
            onClick={capture.toggleOffRecord}
            aria-pressed={offRecord}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium ring-1 transition-colors duration-150 ${
              offRecord ? "bg-midnight text-white ring-midnight" : "ring-line hover:text-accent hover:ring-accent"
            }`}
          >
            <EyeOffIcon className="size-4" /> {offRecord ? "Back on the record" : "Off the record"}
          </button>
          {offRecord && <p className="text-xs text-slate-600">Paused: not being analyzed. A gap is marked in the timeline.</p>}
        </div>
      )}
      {!pipWindow && (
        <p className="mt-3 border-t border-line pt-3 text-xs text-slate-600">
          {pipSupported
            ? "Use Pop out widget in the recording bar to keep these controls on top of other windows."
            : "Use Chrome or Edge to keep these controls on top when you switch windows."}
        </p>
      )}
    </div>
  );

  if (pipWindow)
    return createPortal(
      <div className="flex min-h-screen flex-col items-center gap-3 bg-midnight p-3">
        {circle}
        {panel}
      </div>,
      pipWindow.document.body,
    );

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
      {panel}
      {circle}
    </div>
  );
}
