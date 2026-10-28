import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BasketIcon, HomeIcon, NoteIcon, TodoIcon } from './Icons'
import { Stamp, STAMP_COLORS } from './Scrapbook'
import { useOutboxCount } from '../data/store'
import { useDesktop } from '../lib/desktop'
import { useBounce } from '../lib/bounce'
import { Sidebar } from './Sidebar'

/** Screens inside a household. On desktop they sit on the notebook page next to the sidebar. */
export const Framed = createContext(false)

type ScreenProps = { children: ReactNode; tabbar?: boolean; footer?: ReactNode; className?: string; wide?: boolean; center?: boolean }

/** A screen of notebook paper with the red margin. */
export function Screen({ children, tabbar, footer, className = '', wide, center }: ScreenProps) {
  const desktop = useDesktop()
  const framed = useContext(Framed)
  const scrollRef = useRef<HTMLDivElement>(null)
  useBounce(scrollRef)
  if (desktop && framed) {
    // Desktop: sidebar on the left, the notebook page fills the rest. Screens not laid out
    // for desktop yet keep a comfortable reading width instead of stretching.
    return (
      <div className="desk">
        <Sidebar />
        <div className={`screen scr page ${className}`}>
          <div className="scroll scr" ref={scrollRef}>
            <div className={`desk-content${wide ? ' wide' : ''}${center ? ' center' : ''}`}>{children}</div>
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
      <div className="scroll scr" ref={scrollRef}>{children}</div>
      {footer}
      {tabbar && <TabBar />}
      <OfflineBadge />
    </div>
  )
}

// Money comes in phase 3. Until then the tab is hidden so nothing leads nowhere.
export function TabBar() {
  const { t } = useTranslation()
  const tabs = [
    { to: '/', label: t('tabs.home'), icon: <HomeIcon /> },
    { to: '/shopping', label: t('tabs.shopping'), icon: <BasketIcon /> },
    { to: '/todos', label: t('tabs.todos'), icon: <TodoIcon /> },
    { to: '/notes', label: t('tabs.notes'), icon: <NoteIcon /> },
  ]
  return (
    <nav className="tabbar">
      {tabs.map((tab) => (
        <NavLink key={tab.to} to={tab.to} end className={({ isActive }) => `tab${isActive ? ' on' : ''}`}>
          {({ isActive }) => (
            <>
              <span className="tab-icon">
                {tab.icon}
                {isActive && <InkCircle />}
              </span>
              <span>{tab.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

/** A loose loop of marker around the active tab's icon. It overshoots where it started, like a quick hand circle. */
function InkCircle() {
  return (
    <svg className="tab-circle" viewBox="0 0 46 38" aria-hidden>
      <path
        d="M30.5 4.2C21 1.6 7.6 4.6 4.3 14.2 1.4 23 9.6 33.4 22.6 33.9 35.2 34.4 43 26.4 41.6 17.2 40.4 9.6 32.6 4.6 23.2 4.4 19.6 4.3 16.4 5.2 14.2 6.4"
        pathLength={1}
        fill="none"
        stroke="#A8335A"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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
