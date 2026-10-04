import { useEffect, useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import logoUrl from "../assets/sage-logo.svg";
import type { User } from "../lib/mockData";
import { ListIcon, UserIcon } from "./Icons";
import { ListenButton } from "./ListenButton";

type Props = {
  user: User | null;
  authBusy: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
  /** Solo en Teach: abre la barra de sesiones en móvil. */
  onToggleSessions?: () => void;
};

export function Header({ user, authBusy, onSignIn, onSignOut, onToggleSessions }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => !menuRef.current?.contains(e.target as Node) && setMenuOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <header className="fixed inset-x-0 top-0 z-40 h-16 bg-white shadow-[0_1px_0_var(--color-line),0_6px_20px_-16px_rgb(11_27_51/0.35)]">
      <div className="flex h-full items-center gap-1 px-4 sm:px-6">
        {onToggleSessions && (
          <button
            onClick={onToggleSessions}
            aria-label="Show sessions"
            className="-ml-1 rounded-lg p-2 text-slate-600 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-900 lg:hidden"
          >
            <ListIcon />
          </button>
        )}
        {/* El logo ya incluye el nombre "SAGE" y el lema */}
        <Link to="/" className="rounded-lg py-1" aria-label="Sage home">
          <img src={logoUrl} alt="Sage" className="h-7 w-auto sm:h-10" />
        </Link>

        <div className="ml-auto" />
        <ListenButton />

        {/* Pestañas visibles: cuando Sage cambia de pestaña por voz se ve aquí */}
        <nav aria-label="Mode" className="mr-1.5 flex shrink-0 rounded-xl bg-paper p-1 text-sm sm:mr-4">
          {(["teach", "learn"] as const).map((tab) => (
            <NavLink
              key={tab}
              to={`/${tab}`}
              className={({ isActive }) =>
                `rounded-lg px-2.5 py-1.5 font-medium transition-colors duration-150 sm:px-4 ${
                  isActive ? "bg-accent text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`
              }
            >
              {tab === "teach" ? "Teach" : "Learn"}
            </NavLink>
          ))}
        </nav>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => (user ? setMenuOpen((o) => !o) : onSignIn())}
            disabled={authBusy}
            aria-label={user ? `Account menu for ${user.name}` : "Log in"}
            aria-haspopup={user ? "menu" : undefined}
            aria-expanded={user ? menuOpen : undefined}
            title={user ? user.name : "Log in"}
            className={`grid size-11 place-items-center rounded-full text-sm font-semibold transition-colors duration-200 hover:bg-accent hover:text-white disabled:opacity-60 ${
              user ? "bg-accent-tint text-accent-strong" : "bg-slate-100 text-slate-700"
            }`}
          >
            {user ? user.initials : <UserIcon />}
          </button>

          {user && menuOpen && (
            <div role="menu" className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl bg-white py-1.5 text-slate-800 shadow-soft ring-1 ring-line">
              <div className="border-b border-line px-4 pb-2.5 pt-1.5">
                <p className="text-sm font-semibold">{user.name}</p>
                <p className="text-xs text-slate-600">{user.org}</p>
              </div>
              <button
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="block w-full px-4 py-2 text-left text-sm transition-colors duration-150 hover:bg-accent-tint hover:text-accent-strong"
              >
                Profile
              </button>
              <button
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onSignOut();
                }}
                className="block w-full px-4 py-2 text-left text-sm transition-colors duration-150 hover:bg-accent-tint hover:text-accent-strong"
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
