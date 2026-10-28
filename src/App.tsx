import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigationType, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AuthProvider, useAuth } from './auth'
import { isConfigured } from './lib/supabase'
import { setLanguage } from './i18n'
import { applyTheme } from './lib/theme'
import { useHousehold, useMyProfile } from './data/hooks'
import { InkFilter, ToastHost, UndoHost } from './components/Scrapbook'
import { Framed, Screen } from './components/Shell'
import { AuthScreen, NewPasswordScreen } from './screens/Auth'
import { JoinOrCreateScreen, rememberJoinAddress } from './screens/JoinOrCreate'
import { HouseholdCreatedScreen } from './screens/HouseholdCreated'
import { HomeScreen } from './screens/Home'
import { ArrangeHomeScreen } from './screens/ArrangeHome'
import { ShoppingScreen } from './screens/Shopping'
import { PantryScreen } from './screens/Pantry'
import { TodosScreen } from './screens/Todos'
import { NoteScreen, NotesScreen } from './screens/Notes'
import { ProfileScreen, SettingsScreen } from './screens/Profile'
import { HouseholdsScreen } from './screens/Households'
import { PersonScreen } from './screens/Person'
import { ChatScreen, MessagesScreen } from './screens/Messages'

/** Blank notebook paper while things load. */
function Paper() {
  return <Screen>{null}</Screen>
}

/** Signed in, with at least one household. */
function Inside({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  const { loaded, households } = useHousehold()
  if (loading) return <Paper />
  if (!session) return <Navigate to="/signup" replace />
  if (!loaded) return <Paper />
  if (!households.length) return <Navigate to="/welcome" replace />
  return <Framed.Provider value>{children}</Framed.Provider>
}

/** Signed in, households or not. */
function SignedIn({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return <Paper />
  if (!session) return <Navigate to="/signup" replace />
  return <>{children}</>
}

function SignedOut({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return <Paper />
  if (session) return <Navigate to="/" replace />
  return <>{children}</>
}

/** A shared link like /join/lemon.sunny.goose. */
function JoinLink() {
  const { address, secret } = useParams()
  if (address) rememberJoinAddress(address, secret)
  return <Navigate to="/welcome" replace />
}

/** Keeps the interface language in step with the profile. */
function LanguageSync() {
  const profile = useMyProfile()
  const { i18n } = useTranslation()
  useEffect(() => {
    if (profile?.language && profile.language !== i18n.language) setLanguage(profile.language)
  }, [profile?.language, i18n.language])
  // The theme color follows the profile too.
  useEffect(() => {
    if (profile) applyTheme(profile.theme)
  }, [profile?.theme])
  return null
}

const TABS = ['/', '/shopping', '/todos', '/notes', '/messages']

/**
 * Which way the next screen slides in, like a new sheet of paper. Forward slides in from the right;
 * going back (or to a tab on the left) slides in from the left. The first screen doesn't slide.
 */
function SlideDirection() {
  const location = useLocation()
  const type = useNavigationType()
  const last = useRef<string | null>(null)
  useLayoutEffect(() => {
    const from = last.current
    const to = location.pathname
    last.current = to
    let nav = 'none'
    if (from !== null && from !== to) {
      const a = TABS.indexOf(from)
      const b = TABS.indexOf(to)
      const back = (location.state as { back?: boolean } | null)?.back
      nav = type === 'POP' || back || (a >= 0 && b >= 0 && b < a) ? 'back' : 'forward'
    }
    document.documentElement.dataset.nav = nav
  }, [location.pathname, type, location.state])
  return null
}

function NotConfigured() {
  return (
    <Screen>
      <div className="pad top body" style={{ paddingTop: 120 }}>
        VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are missing.
      </div>
    </Screen>
  )
}

export default function App() {
  if (!isConfigured) return <NotConfigured />
  return (
    <AuthProvider>
      <BrowserRouter>
        <InkFilter />
        <LanguageSync />
        <SlideDirection />
        <Routes>
          <Route path="/signup" element={<SignedOut><AuthScreen mode="signup" /></SignedOut>} />
          <Route path="/login" element={<SignedOut><AuthScreen mode="login" /></SignedOut>} />
          <Route path="/reset" element={<SignedOut><AuthScreen mode="reset" /></SignedOut>} />
          <Route path="/new-password" element={<SignedIn><NewPasswordScreen /></SignedIn>} />
          <Route path="/join/:address" element={<JoinLink />} />
          <Route path="/join/:address/:secret" element={<JoinLink />} />
          <Route path="/welcome" element={<SignedIn><JoinOrCreateScreen /></SignedIn>} />
          <Route path="/created/:id" element={<SignedIn><HouseholdCreatedScreen /></SignedIn>} />
          <Route path="/" element={<Inside><HomeScreen /></Inside>} />
          <Route path="/arrange" element={<Inside><ArrangeHomeScreen /></Inside>} />
          <Route path="/shopping" element={<Inside><ShoppingScreen /></Inside>} />
          <Route path="/pantry" element={<Inside><PantryScreen /></Inside>} />
          <Route path="/todos" element={<Inside><TodosScreen /></Inside>} />
          <Route path="/notes" element={<Inside><NotesScreen /></Inside>} />
          <Route path="/messages" element={<Inside><MessagesScreen /></Inside>} />
          <Route path="/messages/:chat" element={<Inside><ChatScreen /></Inside>} />
          <Route path="/notes/:id" element={<Inside><NoteScreen /></Inside>} />
          <Route path="/profile" element={<Inside><ProfileScreen /></Inside>} />
          <Route path="/settings" element={<Inside><SettingsScreen /></Inside>} />
          <Route path="/households" element={<Inside><HouseholdsScreen /></Inside>} />
          <Route path="/people/:id" element={<Inside><PersonScreen /></Inside>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <ToastHost />
        <UndoHost />
      </BrowserRouter>
    </AuthProvider>
  )
}
