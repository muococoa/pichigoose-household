import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/nunito/500.css'
import '@fontsource/nunito/600.css'
import '@fontsource/nunito/700.css'
import '@fontsource/nunito/800.css'
import '@fontsource/caveat/700.css'
import './styles/scrapbook.css'
import './styles/app.css'
import './styles/desktop.css'
import './i18n'
import App from './App'
import { watchKeyboard } from './lib/keyboard'
import { applySavedTheme } from './lib/theme'
import { registerSW } from 'virtual:pwa-register'

watchKeyboard()
applySavedTheme()

// The app keeps a copy of itself on the phone so it opens without signal. When a new version
// is published, swap to it and reload right away, and look for one each time the app is opened.
registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (!registration) return
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void registration.update()
    })
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
