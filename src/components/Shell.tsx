import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BasketIcon, HomeIcon, NoteIcon, TodoIcon } from './Icons'
import { Stamp, STAMP_COLORS } from './Scrapbook'
import { useOutboxCount } from '../data/store'

/** A screen of notebook paper with the red margin. */
export function Screen({ children, tabbar, footer, className = '' }: { children: ReactNode; tabbar?: boolean; footer?: ReactNode; className?: string }) {
  return (
    <div className={`screen scr ${tabbar ? 'with-tabbar' : ''} ${className}`}>
      <div className="margin" />
      <div className="scroll scr">{children}</div>
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
          {tab.icon}
          <span>{tab.label}</span>
        </NavLink>
      ))}
    </nav>
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
