# AI Apprentice — Fase 1: Capture

Un experto comparte pantalla; un agente de voz (ElevenLabs) observa (Claude visión) y pregunta el *por qué* en las pausas.

1. `cd server && cp .env.example .env` y rellena `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID`, `ANTHROPIC_API_KEY`.
2. `npm install && npm run dev` en `/server` (puerto 3001).
3. En otra terminal: `cd web && npm install && npm run dev` → abre http://localhost:5173 (Chrome/Edge).
4. Pega `docs/interviewer-prompt.md` como system prompt del agente en ElevenLabs.
5. Pulsa **Iniciar sesión**, elige qué pantalla compartir y permite el micrófono.
6. Las sesiones se guardan en `server/data/<sessionId>.json` (eventos, transcripción y huecos fuera de registro).
7. Modelo de visión configurable con `CLAUDE_MODEL` (por defecto `claude-opus-5-5`).
8. Detección de pausas y límites de preguntas: `web/src/lib/pauseDetector.ts`.
