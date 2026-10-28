import { useSyncExternalStore } from 'react'

// The desktop layout starts at 1024 px wide (docs/DESKTOP.md). Narrower is the phone layout.
const query = typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)') : null

function subscribe(cb: () => void) {
  query?.addEventListener('change', cb)
  return () => query?.removeEventListener('change', cb)
}

export function useDesktop() {
  return useSyncExternalStore(subscribe, () => Boolean(query?.matches))
}
