// Toma un JPEG (~1024 px de ancho) de la pantalla compartida cada 2 s,
// omitiendo frames casi idénticos al anterior (diferencia de una miniatura en escala de grises).

const INTERVAL_MS = 2_000;
const TARGET_WIDTH = 1024;
const THUMB_W = 32;
const THUMB_H = 18;
const DIFF_THRESHOLD = 4; // diferencia media por píxel (0-255) por debajo de la cual se omite el frame

export type Frame = { imageBase64: string; t: number };

export async function createFrameSampler(stream: MediaStream, startedAt: number, onFrame: (frame: Frame) => void) {
  const video = document.createElement("video");
  video.srcObject = stream;
  video.muted = true;
  await video.play();

  const canvas = document.createElement("canvas");
  const thumb = document.createElement("canvas");
  thumb.width = THUMB_W;
  thumb.height = THUMB_H;
  const thumbCtx = thumb.getContext("2d", { willReadFrequently: true })!;
  let prevThumb: Uint8ClampedArray | null = null;
  let paused = false;

  const timer = setInterval(() => {
    if (paused || !video.videoWidth) return;

    thumbCtx.drawImage(video, 0, 0, THUMB_W, THUMB_H);
    const pixels = thumbCtx.getImageData(0, 0, THUMB_W, THUMB_H).data;
    if (prevThumb && meanDiff(prevThumb, pixels) < DIFF_THRESHOLD) return;
    prevThumb = pixels;

    const scale = Math.min(1, TARGET_WIDTH / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext("2d")!.drawImage(video, 0, 0, canvas.width, canvas.height);
    onFrame({ imageBase64: canvas.toDataURL("image/jpeg", 0.7).split(",")[1], t: Date.now() - startedAt });
  }, INTERVAL_MS);

  return {
    setPaused(value: boolean) {
      paused = value;
      if (!value) prevThumb = null; // al reanudar, analizar siempre el primer frame
    },
    /** Miniatura difuminada (480 px): representa la sesión sin que se pueda leer nada de la pantalla. */
    blurredThumbnail(): string | null {
      if (!video.videoWidth) return null;
      const out = document.createElement("canvas");
      out.width = 480;
      out.height = Math.round((video.videoHeight / video.videoWidth) * 480);
      const ctx = out.getContext("2d")!;
      ctx.filter = "blur(6px)";
      ctx.drawImage(video, 0, 0, out.width, out.height);
      return out.toDataURL("image/jpeg", 0.6).split(",")[1];
    },
    stop() {
      clearInterval(timer);
      video.srcObject = null;
    },
  };
}

function meanDiff(a: Uint8ClampedArray, b: Uint8ClampedArray) {
  let sum = 0;
  for (let i = 0; i < a.length; i += 4) {
    const grayA = (a[i] + a[i + 1] + a[i + 2]) / 3;
    const grayB = (b[i] + b[i + 1] + b[i + 2]) / 3;
    sum += Math.abs(grayA - grayB);
  }
  return sum / (a.length / 4);
}
