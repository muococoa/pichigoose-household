import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Sheet } from './Scrapbook'
import { Avatar } from './Avatar'
import type { Profile } from '../data/hooks'
import { plain } from '../lib/similar'

export type Archived = { id: string; name: string; at: string; by: string | null }

/** The day a thing was finished, in words: Yesterday, Monday, or 24 October. */
function dayLabel(iso: string, lang: string, t: (k: string) => string) {
  const d = new Date(iso)
  const today = new Date()
  const days = Math.round((new Date(today.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86400000)
  const locale = lang === 'sr' ? 'sr-Latn' : 'en-US'
  if (days === 1) return t('archive.yesterday')
  if (days < 7) return d.toLocaleDateString(locale, { weekday: 'long' })
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'long' })
}

/**
 * Done earlier (Nora, 30 Oct): what was finished before today, grouped by day, newest first. Nothing is deleted;
 * it's out of the way. "Again" puts the same thing back on the list in one tap, for the things you do over and over.
 */
export function ArchiveLink({ rows, people, onAgain, title }: { rows: Archived[]; people: Profile[]; onAgain: (row: Archived) => void; title: string }) {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const [added, setAdded] = useState<string[]>([])
  if (!rows.length) return null
  const sorted = [...rows].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 200)
  // One row per thing per day: the same chore done twice that day shows once, with "×2", whatever the spelling.
  const days: { label: string; rows: (Archived & { times: number })[] }[] = []
  for (const r of sorted) {
    const label = dayLabel(r.at, i18n.language, t)
    let day = days[days.length - 1]
    if (day?.label !== label) days.push((day = { label, rows: [] }))
    // "Rasiriti ves" and "Raširiti veš" are the same chore: the newest spelling shows (rows come newest first).
    const same = day.rows.find((x) => plain(x.name) === plain(r.name))
    if (same) same.times += 1
    else day.rows.push({ ...r, times: 1 })
  }
  return (
    <>
      <div style={{ textAlign: 'center', margin: '22px 0 6px' }}>
        <button type="button" className="link" onClick={() => setOpen(true)} style={{ padding: '8px 12px' }}>
          {t('archive.open', { count: rows.length })}
        </button>
      </div>
      <Sheet open={open} onClose={() => { setOpen(false); setAdded([]) }} title={title}>
        {days.map((d) => (
          <section key={d.label} style={{ marginBottom: 14 }}>
            <div className="label" style={{ marginBottom: 2 }}>{d.label}</div>
            {d.rows.map((r) => {
              const who = people.find((p) => p.id === r.by)
              const again = added.includes(r.id)
              return (
                <div key={r.id} className="ln" style={{ minHeight: 48, gap: 10 }}>
                  {who && <Avatar avatar={who.avatar} label={who.display_name} size={28} />}
                  <span style={{ flex: 1, minWidth: 0, fontSize: 16, color: '#63586B' }}>
                    {r.name}
                    {r.times > 1 && <span className="cap" style={{ marginLeft: 6, fontWeight: 700 }}>×{r.times}</span>}
                  </span>
                  <button
                    type="button"
                    className="stk sec sm"
                    disabled={again}
                    style={{ transform: 'rotate(1.5deg)', flex: 'none' }}
                    onClick={() => {
                      onAgain(r)
                      setAdded((a) => [...a, r.id])
                    }}
                  >
                    {again ? t('archive.added') : t('archive.again')}
                  </button>
                </div>
              )
            })}
          </section>
        ))}
      </Sheet>
    </>
  )
}
