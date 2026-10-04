import { useState } from "react";

// Ventana flotante siempre visible (Document Picture-in-Picture, Chrome/Edge 116+).
// Si no está disponible, la UI usa un widget dentro de la página.

declare global {
  interface Window {
    documentPictureInPicture?: {
      requestWindow(options?: { width?: number; height?: number }): Promise<Window>;
      window: Window | null;
    };
  }
}

export const FLOATING_SIZES = { collapsed: { width: 132, height: 132 }, expanded: { width: 300, height: 380 } };

export function useFloatingWindow() {
  const [win, setWin] = useState<Window | null>(null);
  const supported = typeof window !== "undefined" && "documentPictureInPicture" in window;

  async function open() {
    if (!supported || win) return win;
    try {
      const w = await window.documentPictureInPicture!.requestWindow(FLOATING_SIZES.collapsed);
      copyStyles(w);
      w.document.title = "Sage recording";
      w.document.body.className = "bg-midnight font-sans text-white antialiased";
      w.addEventListener("pagehide", () => setWin(null));
      setWin(w);
      return w;
    } catch (err) {
      console.warn("Document PiP no disponible", err);
      return null;
    }
  }

  function close() {
    win?.close();
    setWin(null);
  }

  return { win, supported, open, close };
}

function copyStyles(target: Window) {
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const style = target.document.createElement("style");
      style.textContent = Array.from(sheet.cssRules, (r) => r.cssText).join("\n");
      target.document.head.appendChild(style);
    } catch {
      // Hojas de otro origen (p. ej. Google Fonts): se enlazan en lugar de copiarse.
      if (sheet.href) {
        const link = target.document.createElement("link");
        link.rel = "stylesheet";
        link.href = sheet.href;
        target.document.head.appendChild(link);
      }
    }
  }
}
