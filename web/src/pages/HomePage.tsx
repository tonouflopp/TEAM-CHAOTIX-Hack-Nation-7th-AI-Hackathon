import { Link } from "react-router-dom";
import { VoiceWave } from "../components/VoiceWave";

export function HomePage() {
  return (
    <div className="flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-center px-4 py-10 text-center">
      <VoiceWave size="hero" />
      <div className="mt-8 flex w-full max-w-sm flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row">
        <Link
          to="/teach"
          className="rounded-xl bg-accent px-10 py-3.5 text-base font-semibold text-white shadow-soft transition-colors duration-150 hover:bg-accent-strong"
        >
          Teach
        </Link>
        <Link
          to="/learn"
          className="rounded-xl bg-white px-10 py-3.5 text-base font-semibold text-accent shadow-soft ring-1 ring-accent/40 transition-colors duration-150 hover:bg-accent hover:text-white"
        >
          Learn
        </Link>
      </div>
      <p className="mt-8 max-w-md text-sm leading-relaxed text-slate-600">
        Your expertise, captured and taught by AI. Gain new abilities with Sage.
      </p>
      <p className="mt-2 text-sm font-medium text-slate-900">Preserver of knowledge</p>
    </div>
  );
}
