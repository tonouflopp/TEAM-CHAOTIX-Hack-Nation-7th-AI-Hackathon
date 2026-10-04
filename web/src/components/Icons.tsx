// Iconos de línea mínimos (24×24, trazo actual). Decorativos: aria-hidden.
type P = { className?: string };
const base = (className = "size-5") => ({
  className,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export const LogoMark = ({ className = "size-8" }: P) => (
  <svg className={className} viewBox="0 0 32 32" aria-hidden>
    <rect width="32" height="32" rx="9" fill="#2563eb" />
    <path d="M10 11 16 22 22 11" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="10" cy="11" r="3.2" fill="#fff" />
    <circle cx="22" cy="11" r="3.2" fill="#0b1b33" stroke="#fff" strokeWidth="1.6" />
    <circle cx="16" cy="22" r="3.2" fill="#fff" />
  </svg>
);

export const UserIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <circle cx="12" cy="8.5" r="3.5" />
    <path d="M5 20a7 7 0 0 1 14 0" />
  </svg>
);
export const ListIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />
  </svg>
);
export const CloseIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);
export const PauseIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M9 6v12M15 6v12" />
  </svg>
);
export const PlayIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M8 5.5v13l10-6.5z" fill="currentColor" stroke="none" />
  </svg>
);
export const StopIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <rect x="7" y="7" width="10" height="10" rx="1.5" fill="currentColor" stroke="none" />
  </svg>
);
export const ShieldIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M12 3 5 6v5c0 4.4 3 8.3 7 9.5 4-1.2 7-5.1 7-9.5V6z" />
    <path d="M12 8v4M12 15.5h.01" />
  </svg>
);
export const QuestionIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M4 5h16v11H9l-5 4z" />
    <path d="M10 9a2 2 0 1 1 2.8 1.8c-.5.3-.8.7-.8 1.2M12 14h.01" />
  </svg>
);
export const ScreenIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <rect x="3" y="4" width="18" height="12" rx="2" />
    <path d="M8 20h8M12 16v4" />
  </svg>
);
export const MapIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <circle cx="6" cy="6" r="2.5" />
    <circle cx="18" cy="12" r="2.5" />
    <circle cx="6" cy="18" r="2.5" />
    <path d="M8.3 7.2l7.4 3.6M15.7 13.2l-7.4 3.6" />
  </svg>
);
export const TeachIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M3 9.5 12 5l9 4.5-9 4.5z" />
    <path d="M7 11.5V16c1.5 1.3 3.2 2 5 2s3.5-.7 5-2v-4.5M21 9.5V15" />
  </svg>
);
export const LockIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
    <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
  </svg>
);
export const ChevronIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="m9 6 6 6-6 6" />
  </svg>
);
export const BackIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="m15 6-6 6 6 6" />
  </svg>
);
export const EyeOffIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M3 3l18 18M10.6 6.1A10 10 0 0 1 12 6c5 0 8.5 4.2 9.5 6-.4.8-1.3 2.1-2.6 3.3M6.4 7.6C4.6 8.9 3.2 10.7 2.5 12c1 1.8 4.5 6 9.5 6 1.6 0 3-.4 4.2-1" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  </svg>
);
export const MicIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
  </svg>
);
export const MicOffIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M3 3l18 18M9 9v2a3 3 0 0 0 5.1 2.1M15 9.3V6a3 3 0 0 0-5.7-1.3" />
    <path d="M5.5 11a6.5 6.5 0 0 0 10.4 5.2M18.4 13.3a6.5 6.5 0 0 0 .1-2.3M12 17.5V21" />
  </svg>
);
export const CheckIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);
export const BookIcon = ({ className }: P) => (
  <svg {...base(className)}>
    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5zM4 20.5A2.5 2.5 0 0 0 6.5 21H20" />
  </svg>
);
