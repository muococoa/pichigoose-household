import { useMemo, useRef, useState, type MouseEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useMe } from '../auth'
import { db } from '../data/store'
import { useHearts, useHousehold, type Heart } from '../data/hooks'
import { Avatar } from './Avatar'

// Hearts, like Instagram: double-tap a comment or chat message to heart it, or tap the small heart next
// to it. Tap the small heart again to take yours back. Under the thing: a red heart with who hearted it.

/** What a heart is on: one comment, chat message or note. */
export type HeartTarget = { comment_id: string } | { message_id: string } | { note_id: string }

const targetId = (t: HeartTarget) => ('comment_id' in t ? t.comment_id : 'message_id' in t ? t.message_id : t.note_id)

/** Every heart in the household, by what it's on. One lookup for a whole chat, not one per bubble. */
export function useHeartsOn() {
  const { household } = useHousehold()
  const hearts = useHearts(household?.id ?? null)
  return useMemo(() => {
    const on = new Map<string, Heart[]>()
    for (const h of [...hearts.rows].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
      const id = h.comment_id ?? h.message_id ?? h.note_id
      if (id) on.set(id, [...(on.get(id) ?? []), h])
    }
    return (t: HeartTarget) => on.get(targetId(t)) ?? []
  }, [hearts.rows])
}

/** Heart something, or take your heart back. Works offline and sends when there's signal. */
export function useHeartActions() {
  const me = useMe()
  const { household } = useHousehold()
  function add(target: HeartTarget, hearts: Heart[]) {
    if (!household || !me || hearts.some((h) => h.user_id === me)) return
    db.insert('hearts', { household_id: household.id, user_id: me, comment_id: null, message_id: null, note_id: null, ...target, created_at: new Date().toISOString() })
  }
  function toggle(target: HeartTarget, hearts: Heart[]) {
    const mine = hearts.find((h) => h.user_id === me)
    if (mine) db.remove('hearts', mine.id)
    else add(target, hearts)
  }
  return { add, toggle }
}

/**
 * Double-tap (or double-click) to heart. Two taps close together in time and place; a double-tap only
 * ever adds a heart, like Instagram. Returns the click handler and a burst key for the big heart.
 */
export function useDoubleTap(onDouble: () => void) {
  const last = useRef<{ t: number; x: number; y: number } | null>(null)
  const [burst, setBurst] = useState(0)
  function onClick(e: MouseEvent) {
    // Taps on links and buttons inside (an avatar, the small heart) are their own thing.
    if ((e.target as HTMLElement).closest('a, button')) return
    const now = Date.now()
    const prev = last.current
    if (prev && now - prev.t < 320 && Math.hypot(e.clientX - prev.x, e.clientY - prev.y) < 30) {
      last.current = null
      // A double-click on a computer selects a word; the heart wins.
      window.getSelection()?.removeAllRanges()
      onDouble()
      setBurst((b) => b + 1)
    } else last.current = { t: now, x: e.clientX, y: e.clientY }
  }
  return { onClick, burst }
}

const HEART = 'M13 21.6s-8.4-5-8.4-11a4.6 4.6 0 0 1 8.4-2.7 4.6 4.6 0 0 1 8.4 2.7c0 6-8.4 11-8.4 11Z'

/** The big heart that pops up where you double-tapped, then fades. */
export function HeartBurst({ burst }: { burst: number }) {
  if (!burst) return null
  return (
    <svg key={burst} className="heart-burst" viewBox="0 0 26 26" width="46" height="46" aria-hidden>
      <path d={HEART} fill="var(--heart)" stroke="#FFFFFF" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}

/** The small heart next to a comment or message: an outline, red and filled once you've hearted it. */
export function HeartButton({ target, hearts, size = 18 }: { target: HeartTarget; hearts: Heart[]; size?: number }) {
  const { t } = useTranslation()
  const me = useMe()
  const { toggle } = useHeartActions()
  const on = hearts.some((h) => h.user_id === me)
  return (
    <button
      type="button"
      className={`heart-btn${on ? ' on' : ''}`}
      aria-pressed={on}
      aria-label={on ? t('hearts.unheart') : t('hearts.heart')}
      title={on ? t('hearts.unheart') : t('hearts.heart')}
      onClick={() => toggle(target, hearts)}
    >
      <svg key={on ? 'on' : 'off'} viewBox="0 0 26 26" width={size} height={size} aria-hidden>
        <path d={HEART} fill={on ? 'var(--heart)' : 'none'} stroke={on ? 'var(--heart)' : 'currentColor'} strokeWidth="2.6" strokeLinejoin="round" />
      </svg>
    </button>
  )
}

/** Under a hearted thing: a small red heart and the avatars of who hearted it. */
export function HeartedBy({ hearts, className = '' }: { hearts: Heart[]; className?: string }) {
  const { t, i18n } = useTranslation()
  const { people } = useHousehold()
  if (!hearts.length) return null
  const who = hearts.map((h) => people.find((p) => p.id === h.user_id))
  const names = new Intl.ListFormat(i18n.language, { type: 'conjunction' }).format(who.map((p) => p?.display_name ?? t('common.someone')))
  const shown = who.slice(0, 4)
  return (
    <span className={`hearted-by ${className}`} role="img" aria-label={t('hearts.by', { names })} title={t('hearts.by', { names })}>
      <svg viewBox="0 0 26 26" width="14" height="14" aria-hidden>
        <path d={HEART} fill="var(--heart)" />
      </svg>
      <span className="hearted-avatars">
        {shown.map((p, i) => (
          <Avatar key={hearts[i].id} avatar={p?.avatar} size={18} className="av hearted-av" />
        ))}
      </span>
      {who.length > shown.length && <span className="hearted-more">+{who.length - shown.length}</span>}
    </span>
  )
}
