// Decide cuándo el agente puede hacer una pregunta.
// Pausa natural = ≥3 s sin eventos de pantalla nuevos + el experto no habla + el agente no habla.
// Límites: máx. 5 preguntas por 10 min y mín. 45 s entre preguntas.

export const PAUSE_CONFIG = {
  quietMs: 3_000,
  minGapMs: 45_000,
  maxQuestions: 5,
  windowMs: 10 * 60_000,
  expertSilenceMs: 1_200, // tiempo sin voz (VAD) para considerar que el experto calló
  vadThreshold: 0.5,
};

export type PauseSignal = { kind: "pause"; text: string } | { kind: "no-interrupt"; text: string };

export class PauseDetector {
  private lastEventAt = 0;
  private lastEventSummary: string | null = null;
  private eventSinceLastQuestion = false;
  private lastVoiceAt = 0;
  private agentSpeaking = false;
  private questionTimes: number[] = [];
  private paused = false; // p. ej. modo "fuera de registro"
  canAsk = false;
  private onSignal: (signal: PauseSignal) => void;

  constructor(onSignal: (signal: PauseSignal) => void) {
    this.onSignal = onSignal;
  }

  screenEvent(summary: string, now = Date.now()) {
    this.lastEventAt = now;
    this.lastEventSummary = summary;
    this.eventSinceLastQuestion = true;
    this.update(now);
  }

  vadScore(score: number, now = Date.now()) {
    if (score >= PAUSE_CONFIG.vadThreshold) this.lastVoiceAt = now;
  }

  setAgentSpeaking(speaking: boolean, now = Date.now()) {
    this.agentSpeaking = speaking;
    this.update(now);
  }

  setPaused(paused: boolean, now = Date.now()) {
    this.paused = paused;
    this.update(now);
  }

  questionAsked(now = Date.now()) {
    this.questionTimes.push(now);
    this.eventSinceLastQuestion = false;
    this.update(now);
  }

  /** Último evento sobre el que se puede preguntar (para enlazar preguntas con eventos). */
  get topic() {
    return this.lastEventSummary;
  }

  /** Llamar periódicamente (p. ej. cada 500 ms). */
  update(now = Date.now()) {
    const next = this.computeCanAsk(now);
    if (next === this.canAsk) return;
    this.canAsk = next;
    this.onSignal(
      next
        ? { kind: "pause", text: `[PAUSA] Puedes hacer UNA pregunta sobre: ${this.lastEventSummary}` }
        : { kind: "no-interrupt", text: "[NO INTERRUMPIR]" },
    );
  }

  private computeCanAsk(now: number) {
    const c = PAUSE_CONFIG;
    if (this.paused || this.agentSpeaking || !this.eventSinceLastQuestion) return false;
    if (now - this.lastEventAt < c.quietMs) return false;
    if (now - this.lastVoiceAt < c.expertSilenceMs) return false;
    this.questionTimes = this.questionTimes.filter((t) => now - t < c.windowMs);
    if (this.questionTimes.length >= c.maxQuestions) return false;
    const lastQ = this.questionTimes.at(-1);
    if (lastQ !== undefined && now - lastQ < c.minGapMs) return false;
    return true;
  }
}
