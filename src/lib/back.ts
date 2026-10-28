import { useLocation, useNavigate } from 'react-router-dom'

/**
 * The app's own back button, never the browser's. It goes to a fixed screen inside the app
 * (Home by default), so it can never land on another website or a page from before Pichigoose
 * was opened. It slides like going back.
 */
export function useBack(to = '/') {
  const navigate = useNavigate()
  return () => navigate(to, { state: { back: true } })
}

/**
 * For screens opened from several places (a person's profile, a private chat): back to where you
 * came from inside the app, or to `fallback` when this was the first screen opened.
 */
export function useBackInApp(fallback = '/') {
  const navigate = useNavigate()
  const location = useLocation()
  const back = useBack(fallback)
  // The first screen of a visit has the key "default"; anything opened inside the app has its own.
  return () => (location.key !== 'default' ? navigate(-1) : back())
}
