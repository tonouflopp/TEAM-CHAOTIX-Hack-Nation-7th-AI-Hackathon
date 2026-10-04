import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ConversationProvider } from '@elevenlabs/react'
import './index.css'
import App from './App.tsx'
import { ToastProvider } from './components/Toasts.tsx'

// Un único ConversationProvider en la raíz: la misma conversación sigue activa en todas las pestañas.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <ConversationProvider>
          <App />
        </ConversationProvider>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>,
)
