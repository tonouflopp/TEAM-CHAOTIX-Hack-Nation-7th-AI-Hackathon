import { useConversationClientTool } from "@elevenlabs/react";
import { useLocation, useNavigate } from "react-router-dom";
import { sessionTitle } from "../lib/format";
import { classroom, lessonBriefing, lessonPath, stepBriefing } from "../lib/lesson";
import type { Workflow } from "../lib/mockData";
import { loadLesson } from "../lib/placeholders";
import { findBest, findTeaching, type Teaching } from "../lib/teachings";

// Herramientas de cliente que el agente puede llamar para controlar la UI.
// Deben existir con el mismo nombre y parámetros en ElevenLabs (scripts/setup-agent.mjs las crea).
// Los parámetros llegan del modelo sin tipar: se validan aquí.
const PAGES: Record<string, { path: string; label: string }> = {
  home: { path: "/", label: "Home" },
  teach: { path: "/teach", label: "Teach" },
  learn: { path: "/learn", label: "Learn" },
};

type Notify = (message: string, tone?: "info" | "success" | "error") => void;

export function useAgentTools(opts: {
  requestRecording: () => Promise<string>;
  teachings: Teaching[] | null;
  workflows: Workflow[] | null;
  notify: Notify;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { notify } = opts;

  // Cada vez que Sage cambia de pantalla se ve un aviso: el usuario sabe que fue por su petición.
  const go = (path: string, label: string) => {
    if (location.pathname + location.search !== path) notify(`Sage opened ${label}`);
    navigate(path);
  };

  const findClass = (topic: string) => {
    const list = opts.teachings ?? [];
    const match = findTeaching(list, topic);
    const titles = list.map((t) => sessionTitle(t)).join("; ");
    return { match, missing: `No class matches "${topic}". Available classes: ${titles || "none yet"}.` };
  };

  useConversationClientTool("navigate", (params) => {
    const page = String(params.page ?? "").toLowerCase();
    const target = Object.hasOwn(PAGES, page) ? PAGES[page] : undefined;
    if (!target) return `Unknown page "${page}". Use home, teach or learn.`;
    go(target.path, target.label);
    return `Opened the ${page} page.`;
  });

  useConversationClientTool("start_recording", async () => {
    if (location.pathname !== "/teach") go("/teach", "Teach");
    return opts.requestRecording();
  });

  useConversationClientTool("open_teachings", () => {
    go("/learn#classes", "the class catalog");
    return `Opened the class catalog. Classes: ${(opts.teachings ?? []).map((t) => sessionTitle(t)).join("; ") || "none yet"}.`;
  });

  useConversationClientTool("open_session", (params) => {
    const { match, missing } = findClass(String(params.topic ?? ""));
    if (!match) return missing;
    go(lessonPath(match.id), `"${sessionTitle(match)}"`);
    return `Opened "${sessionTitle(match)}" by ${match.owner} in self-paced mode. If the learner wants you to teach it, call start_class.`;
  });

  useConversationClientTool("start_class", async (params) => {
    const topic = String(params.topic ?? "").trim();
    const room = classroom.get();
    const list = opts.teachings ?? [];
    // Sin tema y con una clase abierta: se imparte esa.
    const found = topic ? findClass(topic) : { match: list.find((t) => t.id === room.lessonId) ?? null, missing: "Ask the learner what they want to learn." };
    const match = found.match;
    if (!match) return found.missing;

    const { lesson } = await loadLesson(match);
    if (!lesson || lesson.steps.length === 0) {
      go(lessonPath(match.id), `"${sessionTitle(match)}"`);
      return `"${sessionTitle(match)}" has no steps yet, so there's nothing to teach. Tell the learner and suggest another class.`;
    }
    if (room.lessonId === match.id) classroom.setVoice(true);
    else classroom.expectVoice(match.id);
    go(lessonPath(match.id), `the voice class "${sessionTitle(match)}"`);
    return `${lessonBriefing(lesson)}\n\nThe voice class is open on screen. Call show_step with step 1 and teach it.`;
  });

  useConversationClientTool("show_step", (params) => {
    const room = classroom.get();
    if (!room.lesson || !room.lessonId) return "No class is open. Call start_class first.";
    const n = Number(params.step);
    const total = room.lesson.steps.length;
    if (!Number.isInteger(n) || n < 1 || n > total) return `Invalid step. Use a number from 1 to ${total}.`;
    if (!location.pathname.startsWith(lessonPath(room.lessonId))) navigate(lessonPath(room.lessonId));
    classroom.goTo(n - 1);
    return `Showing on screen. ${stepBriefing(room.lesson, n - 1)}`;
  });

  useConversationClientTool("end_class", () => {
    classroom.setVoice(false);
    return "The voice class ended. The learner can keep going at their own pace.";
  });

  useConversationClientTool("open_workflow", (params) => {
    const name = String(params.name ?? "");
    const list = opts.workflows ?? [];
    const match = findBest(list, name, (w) => `${w.name} ${w.description}`);
    if (!match) return `No workflow matches "${name}". Workflows: ${list.map((w) => w.name).join("; ")}.`;
    const tab = location.pathname.startsWith("/teach") ? "teach" : "learn";
    go(`/${tab}/workflows/${match.id}`, `the workflow "${match.name}"`);
    return `Opened the workflow "${match.name}" in ${tab}.`;
  });
}
