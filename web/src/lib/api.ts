export type ScreenEvent = {
  t: number;
  type: string;
  entity: string;
  field: string | null;
  from: string | null;
  to: string | null;
  summary: string;
};

export type TimelineItem =
  | ({ kind: "screen" } & ScreenEvent)
  | { kind: "transcript"; t: number; role: "agent" | "expert"; text: string; isQuestion?: boolean; aboutEvent?: string | null }
  | { kind: "gap"; t: number; until: number | null };

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

export async function getSignedUrl(): Promise<string> {
  const { signedUrl } = await json<{ signedUrl: string }>(await fetch("/api/signed-url"));
  return signedUrl;
}

export async function analyzeFrame(body: { sessionId: string; imageBase64: string; t: number; prevState: string }) {
  return json<{ screenState: string; events: ScreenEvent[] }>(
    await fetch("/api/frame", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
  );
}

export function saveItems(sessionId: string, items: TimelineItem[]) {
  return fetch(`/api/session/${sessionId}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  }).catch((err) => console.error("No se pudo guardar", err));
}
