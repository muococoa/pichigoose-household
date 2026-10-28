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
let registration: ServiceWorkerRegistration | undefined
registerSW({
  immediate: true,
  onRegisteredSW(_url, reg) {
    registration = reg
  },
})

// A backup for home screen apps on iPhone, which can keep showing an old copy: ask the server which
// version is newest. If it isn't this one, update; if the update doesn't take over within a few
// seconds, clear the saved copy and reload. (Saved data like the shopping list isn't touched.)
async function checkVersion() {
  try {
    const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' })
    if (!res.ok) return
    const { build } = (await res.json()) as { build?: string }
    if (!build || build === __BUILD_ID__) return
    // Only once per new version, so a problem can never cause a reload loop.
    if (sessionStorage.getItem('pichigoose.updatedTo') === build) return
    sessionStorage.setItem('pichigoose.updatedTo', build)
    await registration?.update()
    window.setTimeout(async () => {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map((r) => r.unregister()))
      window.location.reload()
    }, 4000)
  } catch {
    // No signal: try again next time.
  }
}

function lookForUpdate() {
  void registration?.update()
  void checkVersion()
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') lookForUpdate()
})
window.addEventListener('pageshow', lookForUpdate)
window.addEventListener('focus', lookForUpdate)
window.setInterval(lookForUpdate, 30 * 60 * 1000)
void checkVersion()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
