import { ScreenIcon } from "./Icons";

export function Thumb({ url, className = "h-12 w-16" }: { url: string | null; className?: string }) {
  return url ? (
    <img src={url} alt="" className={`${className} shrink-0 rounded-lg bg-slate-200 object-cover`} loading="lazy" />
  ) : (
    <span className={`${className} grid shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-400`} aria-hidden>
      <ScreenIcon className="size-5" />
    </span>
  );
}
