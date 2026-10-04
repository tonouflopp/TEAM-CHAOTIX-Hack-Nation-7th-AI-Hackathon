import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, Outlet, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { AppContext, type AppContextValue } from "./AppContext";
import { Header } from "./components/Header";
import { Modal, btn } from "./components/Modal";
import { PRIVACY_KEY, PrivacyNotice } from "./components/PrivacyNotice";
import { FloatingWidget, RecordingBar } from "./components/RecordingControls";
import { useToast } from "./components/Toasts";
import { useAgentSession } from "./hooks/useAgentSession";
import { useAgentTools } from "./hooks/useAgentTools";
import { useCaptureSession } from "./hooks/useCaptureSession";
import { useFloatingWindow } from "./hooks/useFloatingWindow";
import { listSessions, type SessionSummary } from "./lib/api";
import { classroom, lessonPath } from "./lib/lesson";
import type { Stats, User, Workflow } from "./lib/mockData";
import { fetchOrgSessions, fetchStats, fetchWorkflows, signIn, signOut } from "./lib/placeholders";
import type { Teaching } from "./lib/teachings";
import { HomePage } from "./pages/HomePage";
import { NotFound } from "./pages/NotFound";
import { LearnHome } from "./pages/LearnHome";
import { LessonPage } from "./pages/LessonPage";
import { TabHome } from "./pages/TabHome";
import { TabLayout } from "./pages/TabLayout";
import { WorkflowPage } from "./pages/WorkflowPage";
import { TeachSessionPage } from "./pages/TeachSessionPage";

const PAGE_NAMES: [RegExp, string][] = [
  [/^\/teach\/sessions\//, "sesión del profesor"],
  [/^\/(teach|learn)\/workflows\//, "workflow"],
  [/^\/teach/, "teach (profesor: grabar sesiones)"],
  [/^\/learn\/teachings\/.+/, "una clase (alumno)"],
  [/^\/learn/, "learn (alumno: catálogo de clases)"],
  [/^\/$/, "home"],
];

export default function App() {
  const notify = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const agent = useAgentSession(notify);
  const capture = useCaptureSession(notify, agent);
  const floating = useFloatingWindow();

  const [user, setUser] = useState<User | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [mySessions, setMySessions] = useState<SessionSummary[] | null>(null);
  const [orgSessions, setOrgSessions] = useState<SessionSummary[] | null>(null);
  const [workflows, setWorkflows] = useState<Workflow[] | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [privacyFor, setPrivacyFor] = useState<{ workflowId: string | null } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const recording = capture.phase !== "idle";

  const refreshMine = useCallback(async () => {
    try {
      setMySessions(await listSessions());
    } catch {
      setMySessions([]);
      notify("Couldn't load your sessions. Is the server running on port 3001?", "error");
    }
  }, [notify]);

  useEffect(() => {
    refreshMine();
    fetchOrgSessions()
      .then(setOrgSessions)
      .catch(() => setOrgSessions([]));
    fetchWorkflows().then(setWorkflows);
    fetchStats().then(setStats);
  }, [refreshMine]);

  // Enseñanzas = sesiones de la organización (mock) + las guardadas por este profesor.
  const teachings = useMemo<Teaching[] | null>(() => {
    if (!orgSessions || !mySessions) return null;
    const mine = mySessions
      .filter((s) => s.status === "saved")
      .map((s): Teaching => ({ ...s, owner: user?.name ?? "You", tags: s.tags ?? [], source: "mine" }));
    const org = orgSessions.map((s): Teaching => ({ ...s, owner: s.owner ?? "Unknown", tags: s.tags ?? [], source: "org" }));
    return [...mine, ...org].sort((a, b) => b.createdAt - a.createdAt);
  }, [orgSessions, mySessions, user]);

  // El agente sabe en qué página está el usuario.
  useEffect(() => {
    const page = PAGE_NAMES.find(([re]) => re.test(location.pathname))?.[1];
    if (page && agent.status === "connected") agent.contextual(`[PÁGINA] El usuario está en: ${page}.`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, agent.status]);

  // Salir de la página de una clase por voz la termina (sin que Sage hable). Se mira la ruta y no el
  // desmontaje de la página para que StrictMode no cierre una clase recién abierta por start_class.
  useEffect(() => {
    const room = classroom.get();
    if (room.voice && room.lessonId && location.pathname !== lessonPath(room.lessonId)) {
      classroom.setVoice(false);
      agent.contextual("[CLASE TERMINADA] El alumno salió de la clase.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Avisar antes de cerrar la pestaña con una grabación sin guardar.
  useEffect(() => {
    if (!recording) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [recording]);

  async function beginRecording(workflowId: string | null): Promise<string> {
    setSidebarOpen(false);
    await floating.open(); // sin un clic previo el navegador puede negarlo: se usa el widget en la página
    const ok = await capture.start(workflowId);
    if (!ok) {
      floating.close();
      return "Recording didn't start: screen sharing was cancelled or the browser needs the user to click Start recording.";
    }
    return "Recording started.";
  }

  async function requestRecording(workflowId: string | null = null): Promise<string> {
    if (recording) return "A recording is already in progress.";
    if (!location.pathname.startsWith("/teach")) navigate("/teach");
    if (!localStorage.getItem(PRIVACY_KEY)) {
      setPrivacyFor({ workflowId });
      return "The privacy notice is on screen. The user must accept it to start recording.";
    }
    return beginRecording(workflowId);
  }

  async function handleSave() {
    await capture.save();
    floating.close();
    await refreshMine();
  }

  async function handleDelete() {
    setConfirmDelete(false);
    await capture.discard();
    floating.close();
    await refreshMine();
  }

  async function handleSignIn() {
    setAuthBusy(true);
    const u = await signIn();
    setUser(u);
    setAuthBusy(false);
    notify(`Logged in as ${u.name}`, "success");
  }

  async function handleSignOut() {
    setAuthBusy(true);
    await signOut();
    setUser(null);
    setAuthBusy(false);
    notify("Logged out");
  }

  useAgentTools({ requestRecording, teachings, workflows, notify });

  const ctx: AppContextValue = {
    user,
    signIn: handleSignIn,
    agent,
    capture,
    requestRecording,
    mySessions,
    teachings,
    workflows,
    stats,
    sidebarOpen,
    setSidebarOpen,
  };
  const inTeach = location.pathname.startsWith("/teach");

  return (
    <AppContext.Provider value={ctx}>
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-white px-4 py-2 text-sm font-medium focus:not-sr-only focus:fixed focus:left-4 focus:top-20"
      >
        Skip to content
      </a>
      <Header
        user={user}
        authBusy={authBusy}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        onToggleSessions={inTeach ?() => setSidebarOpen(!sidebarOpen) : undefined}
      />

      <div className="pt-16">
        {recording && (
          <RecordingBar
            capture={capture}
            onSave={handleSave}
            onRequestDelete={() => setConfirmDelete(true)}
            canPopOut={floating.supported && !floating.win}
            onPopOut={floating.open}
            onShowLive={location.pathname === "/teach" ? undefined : () => navigate("/teach")}
            className={inTeach ? "lg:pl-[300px]" : ""}
          />
        )}

        <main id="main">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/teach" element={<TabLayout tab="teach" />}>
              <Route index element={<TabHome tab="teach" />} />
              <Route path="sessions/:id" element={<TeachSessionPage />} />
              <Route path="workflows/:id" element={<WorkflowPage tab="teach" />} />
            </Route>
            {/* Learn tiene su propia interfaz: sin barra de grabaciones, centrada en clases */}
            <Route path="/learn" element={<Outlet />}>
              <Route index element={<LearnHome />} />
              <Route path="teachings" element={<Navigate to="/learn#classes" replace />} />
              <Route path="teachings/:id" element={<LessonPage />} />
              <Route
                path="workflows/:id"
                element={
                  <div className="px-4 py-8 sm:px-6 sm:py-10 lg:px-10">
                    <WorkflowPage tab="learn" />
                  </div>
                }
              />
            </Route>
            <Route path="*" element={<NotFound back={{ to: "/", label: "home" }} />} />
          </Routes>
        </main>
      </div>

      {recording && (
        <FloatingWidget
          capture={capture}
          pipWindow={floating.win}
          pipSupported={floating.supported}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}

      {privacyFor && (
        <PrivacyNotice
          onCancel={() => setPrivacyFor(null)}
          onAccept={() => {
            localStorage.setItem(PRIVACY_KEY, "1");
            const { workflowId } = privacyFor;
            setPrivacyFor(null);
            beginRecording(workflowId);
          }}
        />
      )}

      {confirmDelete && (
        <Modal
          title="Delete this recording?"
          onClose={() => setConfirmDelete(false)}
          actions={
            <>
              <button data-autofocus onClick={() => setConfirmDelete(false)} className={btn.secondary}>
                Keep it
              </button>
              <button onClick={handleDelete} className={btn.danger}>
                Delete recording
              </button>
            </>
          }
        >
          The video, timeline and transcript of this session will be removed. This can't be undone.
        </Modal>
      )}
    </AppContext.Provider>
  );
}
