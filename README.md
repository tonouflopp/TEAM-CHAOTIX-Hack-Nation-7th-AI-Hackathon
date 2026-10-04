# Sage — Preserver of knowledge

Un experto graba su pantalla (Teach); un agente de voz (ElevenLabs) observa (Claude visión), pregunta el *por qué* en las pausas y la sesión se convierte en un Work Map que otros aprenden con Sage (Learn).

1. **Presidio** (filtro de datos personales, Python 3.13): `cd presidio` y sigue [presidio/README.md](presidio/README.md); luego `.venv\Scripts\python app.py` (puerto 5002).
2. **Server**: `cd server && cp .env.example .env`, rellena las llaves, `npm install && npm run dev` (puerto 3001). Si Presidio no está levantado, usa un filtro regex básico y lo avisa en consola y en la UI.
3. **Web**: `cd web && npm install && npm run dev` → http://localhost:5173 (Chrome/Edge para el widget flotante).
4. Configura el agente en ElevenLabs con `docs/agent-prompt.md` (system prompt + 4 client tools).
5. Sesiones en `server/data/<id>.json` (+ `<id>.jpg`, miniatura difuminada). El vídeo se queda en el navegador.
6. Sin backend todavía (login, enseñanzas de la organización, subida de vídeo, Work Map con IA, tutor): `web/src/lib/placeholders.ts`, datos en `mockData.ts`.
7. Pausas y límites de preguntas: `web/src/lib/pauseDetector.ts`. Work Map provisional: `web/src/lib/workMap.ts`.
