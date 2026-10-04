import { useEffect, useRef } from "react";
import { useConversationControls, useConversationInput, useConversationMode, useConversationStatus } from "@elevenlabs/react";

// Onda de voz en canvas: muchas líneas finas y semitransparentes forman una cinta
// alrededor de una línea central brillante. La amplitud sigue la voz del agente
// (salida de audio de ElevenLabs). Mientras Sage escucha, respira de forma visible y sigue la voz
// del usuario (micrófono); si no escucha (micro silenciado o sin conexión) queda plana y atenuada.

type Size = "hero" | "compact" | "panel";

const BOX: Record<Size, string> = {
  hero: "h-48 w-full max-w-3xl sm:h-64",
  compact: "h-14 w-64",
  panel: "h-28 w-full",
};
const LINES: Record<Size, number> = { hero: 22, compact: 12, panel: 16 };

const STOPS: [number, string][] = [
  [0, "#e11d48"],
  [0.2, "#db2777"],
  [0.42, "#9333ea"],
  [0.64, "#2563eb"],
  [0.84, "#0891b2"],
  [1, "#0d9488"],
];

export function VoiceWave({ size = "hero", className = "" }: { size?: Size; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controls = useConversationControls();
  const { status } = useConversationStatus();
  const { isSpeaking } = useConversationMode();
  const { isMuted } = useConversationInput();
  const mood = status !== "connected" || isMuted ? "idle" : isSpeaking ? "speaking" : "listening";
  const moodRef = useRef(mood);
  moodRef.current = mood;

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const lines = LINES[size];
    let w = 0;
    let h = 0;
    let level = 0; // volumen suavizado 0..1
    let t = 0;
    let last = performance.now();
    let raf = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    };

    const average = (data: Uint8Array) => {
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i];
      return data.length ? sum / data.length / 255 : 0;
    };
    // Hablando: voz de Sage. Escuchando: voz del usuario, algo más contenida.
    const readLevel = () => {
      if (moodRef.current === "listening")
        return Math.min(0.75, Math.max(average(controls.getInputByteFrequencyData()) * 2, controls.getInputVolume() * 1.4));
      return Math.min(1, Math.max(average(controls.getOutputByteFrequencyData()) * 2.4, controls.getOutputVolume() * 1.8));
    };

    const curve = (u: number, phase: number, speed: number) =>
      0.62 * Math.sin(u * Math.PI * 2 * 1.5 + t * 1.8 * speed + phase) +
      0.38 * Math.sin(u * Math.PI * 2 * 3.2 - t * 1.25 * speed + phase * 1.7);

    function draw() {
      if (!w || !h) return;
      ctx.clearRect(0, 0, w, h);
      const mid = h / 2;
      const mood = moodRef.current;
      // Escuchando: respiración amplia y lenta para que se note que Sage está atento.
      const breathing = mood === "listening" ? 0.17 + 0.09 * Math.sin(t * 2.1) : mood === "idle" ? 0.025 : 0.05 + 0.025 * Math.sin(t * 1.3);
      const dim = mood === "idle" ? 0.45 : 1;
      const amp = h * 0.44 * Math.min(1, breathing + level * 0.95);
      const gradient = ctx.createLinearGradient(0, 0, w, 0);
      for (const [at, color] of STOPS) gradient.addColorStop(at, color);
      ctx.strokeStyle = gradient;
      ctx.lineCap = "round";
      const step = Math.max(2, w / 240);

      const path = (factor: number, phase: number, speed: number) => {
        ctx.beginPath();
        for (let x = 0; x <= w + step; x += step) {
          const u = Math.min(1, x / w);
          const envelope = Math.pow(Math.sin(Math.PI * u), 2.2); // se anula en los extremos
          const y = mid + amp * envelope * factor * curve(u, phase, speed);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      };

      // Cinta: líneas finas con fase y amplitud ligeramente distintas.
      ctx.shadowBlur = 0;
      ctx.lineWidth = 1;
      for (let i = 0; i < lines; i++) {
        const spread = (i / (lines - 1)) * 2 - 1; // -1..1
        ctx.globalAlpha = (0.16 + 0.3 * (1 - Math.abs(spread))) * dim;
        path(0.35 + 0.65 * Math.cos(spread * 1.2 + t * 0.35), spread * 1.3, 1 + spread * 0.12);
      }

      // Línea central brillante con un brillo suave.
      ctx.globalAlpha = dim;
      ctx.lineWidth = size === "compact" ? 1.6 : 2.2;
      ctx.shadowColor = "rgba(124, 58, 237, 0.45)";
      ctx.shadowBlur = size === "compact" ? 6 : 12;
      path(0.14, 0, 0.8);
      ctx.shadowBlur = 0;
    }

    const frame = (now: number) => {
      const dt = Math.min(50, now - last);
      last = now;
      const target = readLevel();
      level += (target - level) * (target > level ? 0.2 : 0.06);
      t += dt / 1000;
      draw();
      raf = requestAnimationFrame(frame);
    };

    // Con movimiento reducido: sin desplazamiento; solo cambia la altura, pocas veces por segundo.
    let interval = 0;
    const start = () => {
      cancelAnimationFrame(raf);
      clearInterval(interval);
      if (reduced.matches) {
        interval = window.setInterval(() => {
          const target = readLevel() > 0.06 ? 0.55 : 0;
          if (Math.abs(target - level) > 0.01) {
            level = target;
            draw();
          }
        }, 250);
        draw();
      } else {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    reduced.addEventListener("change", start);
    start();
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(interval);
      observer.disconnect();
      reduced.removeEventListener("change", start);
    };
  }, [controls, size]);

  return <canvas ref={canvasRef} aria-hidden className={`block ${BOX[size]} ${className}`} />;
}
