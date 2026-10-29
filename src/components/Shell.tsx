import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { NavLink, useLocation, useNavigate, useNavigationType } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BasketFilled, BasketIcon, HomeFilled, HomeIcon, InkCircle, MessagesFilled, MessagesIcon, NoteFilled, NoteIcon, TodoFilled, TodoIcon } from './Icons'
import { DoodleSpot, Stamp, STAMP_COLORS, type DoodlePose } from './Scrapbook'
import { flush, refetchAll, useOutboxCount } from '../data/store'
import { useDesktop } from '../lib/desktop'
import { useUnreadTotal } from '../data/chats'
import { useBounce } from '../lib/bounce'
import { browserOwnsLeftEdge, useEdgeSwipe } from '../lib/swipe'
import { Sidebar } from './Sidebar'

/** Screens inside a household. On desktop they sit on the notebook page next to the sidebar. */
export const Framed = createContext(false)

type ScreenProps = { children: ReactNode; tabbar?: boolean; footer?: ReactNode; className?: string; wide?: boolean; center?: boolean; doodle?: DoodlePose }

/** A screen of notebook paper with the red margin. */
export function Screen({ children, tabbar, footer, className = '', wide, center, doodle }: ScreenProps) {
  // A doodle of Pichi in the empty paper at the bottom, when the page asks for one.
  const page = doodle ? (
    <div className="paper-col">
      {children}
      <DoodleSpot pose={doodle} />
    </div>
  ) : (
    children
  )
  const desktop = useDesktop()
  const framed = useContext(Framed)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inkRef = useRef<HTMLDivElement>(null)
  useBounce(scrollRef, inkRef, refresh)
  useSwipeBack(!desktop)
  useScrollMemory(scrollRef)
  if (desktop && framed) {
    // Desktop: sidebar on the left, the notebook page fills the rest. Screens not laid out
    // for desktop yet keep a comfortable reading width instead of stretching.
    return (
      <div className="desk">
        <Sidebar />
        <div className={`screen scr page ${className}`}>
          <div className="margin" />
          <div className="scroll scr" ref={scrollRef}>
            <div className={`desk-content${wide ? ' wide' : ''}${center ? ' center' : ''}${doodle ? ' paper-col' : ''}`}>{page}</div>
          </div>
          {footer && <div className={`desk-footer${wide ? ' wide' : ''}`}>{footer}</div>}
          <OfflineBadge />
        </div>
      </div>
    )
  }
  if (desktop) {
    // Desktop, outside a household (sign up, join, new password): one sheet of paper on the lilac desk.
    return (
      <div className="desk solo">
        <div className={`screen scr page ${className}`}>
          <div className="scroll scr" ref={scrollRef}>
            <div className={`solo-content${wide ? ' wide' : ''}`}>{children}</div>
          </div>
          {footer && <div className="solo-content">{footer}</div>}
          <OfflineBadge />
        </div>
      </div>
    )
  }
  return (
    <div className={`screen scr ${tabbar ? 'with-tabbar' : ''} ${className}`}>
      <div className="margin" />
      <PullInk ref={inkRef} />
      <div className="scroll scr" ref={scrollRef}>{page}</div>
      {footer}
      {tabbar && <TabBar />}
      <OfflineBadge />
    </div>
  )
}

/** From the left edge to the right goes back on every screen but Home: Shopping, To-dos and Notes go Home;
 *  everything else (Messages, Pantry, a note, a profile) back to wherever you were before. */
function useSwipeBack(phone: boolean) {
  const navigate = useNavigate()
  const location = useLocation()
  const path = location.pathname
  const action =
    !phone || path === '/' || browserOwnsLeftEdge()
      ? null
      : () => {
          if (['/shopping', '/todos', '/notes'].includes(path) || location.key === 'default') navigate('/', { state: { back: true } })
          else navigate(-1)
        }
  useEdgeSwipe('left', action)
}

// Where each screen was scrolled to, so going back lands you where you left off (Nora, 29 Oct): reply to Danko,
// swipe back, and you're at the same shelf in Pantry. Kept by visit, and by page for "back to Home".
const scrolledByVisit = new Map<string, number>()
const scrolledByPage = new Map<string, number>()
function useScrollMemory(ref: React.RefObject<HTMLDivElement | null>) {
  const location = useLocation()
  const type = useNavigationType()
  const back = type === 'POP' || Boolean((location.state as { back?: boolean } | null)?.back)
  const page = location.pathname + location.search
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const saved = back ? (scrolledByVisit.get(location.key) ?? scrolledByPage.get(page)) : undefined
    if (saved) {
      el.scrollTop = saved
      // Once more after the first paint, in case the page was still growing.
      requestAnimationFrame(() => (el.scrollTop = saved))
    }
    const remember = () => {
      scrolledByVisit.set(location.key, el.scrollTop)
      scrolledByPage.set(page, el.scrollTop)
    }
    el.addEventListener('scroll', remember, { passive: true })
    return () => el.removeEventListener('scroll', remember)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key])
}

// The bottom menu, floating like WhatsApp's: a frosted paper pill with the lists scrolling behind it.
const ICON = 34
const STROKE = (2 * 26) / ICON // the same 2 px line as every other icon, at the bigger size
let lastTab = -1
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Money comes in phase 3. Until then the tab is hidden so nothing leads nowhere.
export function TabBar() {
  const { t } = useTranslation()
  const unread = useUnreadTotal()
  const { pathname } = useLocation()
  // Outlined icons; the selected one is filled with ink, like WhatsApp's menu.
  const tabs = [
    { to: '/', label: t('tabs.home'), icon: <HomeIcon size={ICON} width={STROKE} />, on: <HomeFilled size={ICON} /> },
    { to: '/shopping', label: t('tabs.shopping'), icon: <BasketIcon size={ICON} width={STROKE} />, on: <BasketFilled size={ICON} /> },
    { to: '/todos', label: t('tabs.todos'), icon: <TodoIcon size={ICON} width={STROKE} />, on: <TodoFilled size={ICON} /> },
    { to: '/notes', label: t('tabs.notes'), icon: <NoteIcon size={ICON} width={STROKE} />, on: <NoteFilled size={ICON} /> },
    { to: '/messages', label: t('tabs.messages'), icon: <MessagesIcon size={ICON} width={STROKE} />, on: <MessagesFilled size={ICON} /> },
  ]
  const index = tabs.findIndex((tab) => tab.to === pathname)
  const barRef = useRef<HTMLElement>(null)
  // Every screen draws its own menu. When you've come from another tab, the bar bounces right as you tap,
  // together with the ink circle (it used to wait for the page to land, which felt late).
  useLayoutEffect(() => {
    const from = lastTab
    lastTab = index
    if (index < 0 || from < 0 || from === index || reducedMotion()) return
    barRef.current?.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(1.03, 1.05)', offset: 0.3 }, { transform: 'scale(.99, .985)', offset: 0.62 }, { transform: 'scale(1)' }],
      { duration: 480, easing: 'ease-out' },
    )
  }, [index])
  return (
    <nav className="tabbar" ref={barRef}>
      {tabs.map((tab, i) => (
        <NavLink key={tab.to} to={tab.to} end className={`tab${i === index ? ' on' : ''}`}>
          <span className="tab-icon">
            {i === index ? tab.on : tab.icon}
            {/* The chosen tab: a hand-drawn ink circle around its icon, drawn on quickly. */}
            {i === index && <InkCircle />}
            {tab.to === '/messages' && unread > 0 && <span className="tab-badge">{unread > 99 ? '99+' : unread}</span>}
          </span>
          <span>{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

/** Pull to refresh: send anything waiting on this phone, then load everything new. */
async function refresh() {
  await flush()
  await refetchAll()
}

/** The ink circle that draws itself behind the paper while you pull down, and spins while refreshing. */
function PullInk({ ref }: { ref: React.Ref<HTMLDivElement> }) {
  return (
    <div className="pull-ink" ref={ref} aria-hidden>
      <svg viewBox="0 0 46 38" width="40" height="34">
        <path
          d="M30.5 4.2C21 1.6 7.6 4.6 4.3 14.2 1.4 23 9.6 33.4 22.6 33.9 35.2 34.4 43 26.4 41.6 17.2 40.4 9.6 32.6 4.6 23.2 4.4 19.6 4.3 16.4 5.2 14.2 6.4"
          pathLength={1}
          fill="none"
          style={{ stroke: 'var(--hero-dark)' }}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}

function subscribeOnline(cb: () => void) {
  window.addEventListener('online', cb)
  window.addEventListener('offline', cb)
  return () => {
    window.removeEventListener('online', cb)
    window.removeEventListener('offline', cb)
  }
}

export function useOnline() {
  return useSyncExternalStore(subscribeOnline, () => navigator.onLine)
}

/** A small stamp while changes made on this phone haven't reached the others yet. */
function OfflineBadge() {
  const { t } = useTranslation()
  const waiting = useOutboxCount() > 0
  // Only after 10 seconds of waiting. Normal saves take less than a second and shouldn't flash a stamp.
  const [late, setLate] = useState(false)
  useEffect(() => {
    if (!waiting) {
      setLate(false)
      return
    }
    const timer = window.setTimeout(() => setLate(true), 10000)
    return () => window.clearTimeout(timer)
  }, [waiting])
  if (!late) return null
  return (
    <div className="offline" aria-live="polite">
      <Stamp color={STAMP_COLORS.claude} rotate={2}>
        {t('common.notSynced')}
      </Stamp>
    </div>
  )
}

/** Things fixed to the screen (the round +, the add bar) live outside the scrolling paper,
 *  so they stay put when the paper bounces at the ends. */
export function Floating({ children }: { children: ReactNode }) {
  return createPortal(children, document.body)
}
