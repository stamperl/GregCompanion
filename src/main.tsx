import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  const baseUrl = import.meta.env.BASE_URL
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(`${baseUrl}sw.js`, { scope: baseUrl })
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
