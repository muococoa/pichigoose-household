import { useCallback, useRef, useState } from 'react'

// Things you were in the middle of (Nora, 29 Oct): an open pop-up, half-typed text, a reply you'd started.
// Leave the screen (Danko messages you, you answer) and come back: it's all still there, as you left it.
// Kept on this phone for this visit (it survives the app reloading, not closing it for good), and forgotten
// as soon as you save, send or close it yourself.

const STORE = 'pichigoose.kept.v1'
let kept: Record<string, unknown> = {}
try {
  kept = JSON.parse(sessionStorage.getItem(STORE) ?? '{}') as Record<string, unknown>
} catch {
  // Private mode or broken data: start empty.
}

let saveTimer: number | undefined
function save() {
  window.clearTimeout(saveTimer)
  saveTimer = window.setTimeout(() => {
    try {
      sessionStorage.setItem(STORE, JSON.stringify(kept))
    } catch {
      // Storage full or blocked: it still works until the app reloads.
    }
  }, 150)
}

const empty = (v: unknown) => v === null || v === undefined || v === '' || v === false

/** Like useState, but kept under `key` while you're away. Empty values (null, '', false) aren't kept. */
export function useKept<T>(key: string | null, initial: T): [T, (next: T | ((prev: T) => T)) => void] {
  const read = (k: string | null) => (k && k in kept ? (kept[k] as T) : initial)
  const [value, setValue] = useState<T>(() => read(key))
  // A different key (another chat, another household): load what was kept for that one.
  const lastKey = useRef(key)
  if (lastKey.current !== key) {
    lastKey.current = key
    const next = read(key)
    if (!Object.is(next, value)) setValue(next)
  }
  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const v = typeof next === 'function' ? (next as (p: T) => T)(prev) : next
        if (key) {
          if (empty(v) || Object.is(v, initial)) delete kept[key]
          else kept[key] = v
          save()
        }
        return v
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  )
  return [value, set]
}

/** Forget everything kept under keys that start with `prefix` (after saving, sending or closing). */
export function forget(prefix: string) {
  for (const k of Object.keys(kept)) if (k.startsWith(prefix)) delete kept[k]
  save()
}
