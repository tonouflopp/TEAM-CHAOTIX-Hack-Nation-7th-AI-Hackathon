import { Link } from "react-router-dom";

export function NotFound({ back }: { back: { to: string; label: string } }) {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="text-slate-700">This session doesn't exist or was deleted.</p>
      <Link to={back.to} className="mt-4 inline-block rounded-lg px-3 py-2 text-sm font-medium text-accent hover:bg-accent-tint">
        Back to {back.label}
      </Link>
    </div>
  );
}
