import { useNavigate } from 'react-router-dom'

/**
 * The app's own back, everywhere (Nora, 30 Oct): back to the screen you came from inside the app (To-dos, then the
 * hub, then a project: back lands on To-dos again, not Home). Only when there's nothing earlier in the app, like the
 * first screen after opening it, does it go to `to` (Home by default), so it can never leave Pichigoose or land on
 * a page from before it was opened. Moving between tabs replaces the page, so tabs don't pile up behind you.
 */
export function canGoBackInApp() {
  // The router numbers each page of this visit from 0; replacing a page keeps its number.
  const idx = (window.history.state as { idx?: number } | null)?.idx
  return typeof idx === 'number' && idx > 0
}

export function useBack(to = '/') {
  const navigate = useNavigate()
  return () => (canGoBackInApp() ? navigate(-1) : navigate(to, { state: { back: true }, replace: true }))
}

/** The same rule; kept as a name for the screens that already use it. */
export const useBackInApp = useBack
