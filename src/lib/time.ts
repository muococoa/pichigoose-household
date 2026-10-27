import { locale } from '../i18n'

const DAY = 24 * 60 * 60 * 1000

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/** Day difference between a date and today, in the phone's time zone. */
export function daysFromToday(date: Date, now = new Date()) {
  return Math.round((startOfDay(date).getTime() - startOfDay(now).getTime()) / DAY)
}

/** "2 hours ago", "yesterday", "Monday", "Oct 3". */
export function ago(iso: string, lang: string, now = new Date()) {
  const date = new Date(iso)
  const rtf = new Intl.RelativeTimeFormat(locale(lang), { numeric: 'auto' })
  const minutes = Math.round((now.getTime() - date.getTime()) / 60000)
  const days = daysFromToday(date, now)
  if (days === 0) {
    if (minutes < 60) return rtf.format(-Math.max(minutes, 0), 'minute')
    return rtf.format(-Math.round(minutes / 60), 'hour')
  }
  if (days === -1) return rtf.format(-1, 'day')
  if (days > -7) return date.toLocaleDateString(locale(lang), { weekday: 'long' })
  return date.toLocaleDateString(locale(lang), { month: 'short', day: 'numeric' })
}

/** A due date: "today", "tomorrow", "Saturday", "Nov 3". Dates are stored as yyyy-mm-dd. */
export function dueLabel(due: string, lang: string, now = new Date()) {
  const date = fromDateString(due)
  const days = daysFromToday(date, now)
  const rtf = new Intl.RelativeTimeFormat(locale(lang), { numeric: 'auto' })
  if (days >= -1 && days <= 1) return rtf.format(days, 'day')
  if (days > 1 && days < 7) return date.toLocaleDateString(locale(lang), { weekday: 'long' })
  return date.toLocaleDateString(locale(lang), { month: 'short', day: 'numeric' })
}

export function fromDateString(s: string) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function toDateString(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function addDays(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
}

export function weekdayName(d: Date, lang: string) {
  return d.toLocaleDateString(locale(lang), { weekday: 'long' })
}

/** The next due date for a repeating to-do. */
export function nextDue(due: string | null, repeat: 'daily' | 'weekly' | 'monthly', now = new Date()) {
  const base = due ? fromDateString(due) : startOfDay(now)
  let next = base
  const step = () => {
    if (repeat === 'daily') next = addDays(next, 1)
    else if (repeat === 'weekly') next = addDays(next, 7)
    else next = new Date(next.getFullYear(), next.getMonth() + 1, next.getDate())
  }
  step()
  // If it was late, jump ahead to the first date after today.
  while (daysFromToday(next, now) < 1 && due) step()
  return toDateString(next)
}

export function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
