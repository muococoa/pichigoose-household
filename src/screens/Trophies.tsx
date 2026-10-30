import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useHousehold, useItemsIn, useLists, useTodos, type Item, type Todo } from '../data/hooks'
import { Screen } from '../components/Shell'
import { Hand } from '../components/Scrapbook'
import { Avatar } from '../components/Avatar'
import { BackIcon } from '../components/Icons'
import { Trophy } from '../components/Trophy'
import { useBackInApp } from '../lib/back'
import { monthOf, monthsWithActivity, streakOf, trophies, type Chore, type Month, type Win } from '../lib/chores'

const NOTES = ['n-butter', 'n-mint', 'n-blush', 'n-mist', 'n-sage', 'n-peach', 'n-lilac', 'n-sand']

/** Everything trophies need: the household's to-dos and every list's items. */
export function useTrophyData() {
  const { household, people } = useHousehold()
  const hid = household?.id ?? null
  const todos = useTodos(hid)
  const lists = useLists(hid)
  const items = useItemsIn(lists.rows.map((l) => l.id))
  return { people, todos: todos.rows as Todo[], items: items.rows as Item[] }
}

export function monthName(month: Month, lang: string) {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString(lang === 'sr' ? 'sr-Latn' : 'en-US', { month: 'long', year: 'numeric' })
}

function shift(month: Month, by: number): Month {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + by, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** The monthly recap: one trophy per chore, to whoever did the most this month. Older months one tap back. */
export function TrophiesScreen() {
  const { t, i18n } = useTranslation()
  const back = useBackInApp()
  const { people, todos, items } = useTrophyData()
  const thisMonth = monthOf(new Date().toISOString())
  const [month, setMonth] = useState<Month>(thisMonth)
  const oldest = useMemo(() => monthsWithActivity(todos, items).at(-1) ?? thisMonth, [todos, items, thisMonth])
  const wins = useMemo(() => trophies(todos, items, month), [todos, items, month])
  const person = (id: string) => people.find((p) => p.id === id)

  function card(w: Win, i: number) {
    const who = person(w.winner)
    const big = streakOf(todos, items, w.chore, w.winner, w.month) >= 3
    const others = Object.entries(w.counts)
      .filter(([id]) => id !== w.winner)
      .sort((a, b) => b[1] - a[1])
    return (
      <div key={w.chore} className={`note ${NOTES[i % NOTES.length]}`} style={{ display: 'flex', gap: 14, alignItems: 'center', transform: `rotate(${[-0.8, 0.7, -0.5, 0.9][i % 4]}deg)` }}>
        <Trophy chore={w.chore} big={big} size={92} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <Hand size={26} lineHeight={28}>
            {big ? t(`trophies.big.${w.chore}`) : t(`trophies.names.${w.chore}`)}
          </Hand>
          <div className="row" style={{ gap: 8, marginTop: 6 }}>
            {who && <Avatar avatar={who.avatar} label={who.display_name} size={28} />}
            <span style={{ fontWeight: 800, fontSize: 15 }}>
              {who?.display_name ?? t('common.someone')} · {t(w.chore === 'groceries' ? 'trophies.runs' : 'trophies.times', { count: w.count })}
            </span>
          </div>
          {others.length > 0 && (
            <div className="cap" style={{ marginTop: 4 }}>
              {others.map(([id, n]) => `${person(id)?.display_name ?? t('common.someone')} ${n}`).join(' · ')}
            </div>
          )}
          {big && <div className="cap" style={{ marginTop: 4, fontWeight: 700 }}>{t('trophies.inARow', { count: streakOf(todos, items, w.chore, w.winner, w.month) })}</div>}
        </div>
      </div>
    )
  }

  return (
    <Screen>
      <div style={{ padding: 'calc(var(--top) + 8px) 22px 32px 40px', maxWidth: 720 }}>
        <div className="row" style={{ gap: 6, marginLeft: -10 }}>
          <button type="button" aria-label={t('common.back')} onClick={back} style={{ display: 'flex', color: '#1E1A30' }}>
            <BackIcon />
          </button>
          <Hand as="h1" style={{ margin: 0 }}>
            {t('trophies.title')}
          </Hand>
        </div>

        {/* Which month: the recap of this month, and the ones before it. */}
        <div className="row" style={{ justifyContent: 'space-between', margin: '16px 0 20px' }}>
          <button type="button" className="stk sec sm" disabled={month <= oldest} aria-label={t('trophies.earlier')} style={{ width: 38, padding: 0, transform: 'rotate(-3deg)' }} onClick={() => setMonth(shift(month, -1))}>
            ‹
          </button>
          <Hand size={30} lineHeight={32}>
            {monthName(month, i18n.language)}
          </Hand>
          <button type="button" className="stk sec sm" disabled={month >= thisMonth} aria-label={t('trophies.later')} style={{ width: 38, padding: 0, transform: 'rotate(3deg)' }} onClick={() => setMonth(shift(month, 1))}>
            ›
          </button>
        </div>

        {wins.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>{wins.map(card)}</div>
        ) : (
          <p className="body" style={{ textAlign: 'center', color: '#63586B' }}>{t('trophies.empty')}</p>
        )}
        <p className="cap" style={{ marginTop: 26, textAlign: 'center' }}>
          {t('trophies.how')}
        </p>
      </div>
    </Screen>
  )
}

/** A person's trophy case on their profile: every trophy they've won, newest first, the same chore stacked. */
export function TrophyCase({ personId }: { personId: string }) {
  const { t, i18n } = useTranslation()
  const { todos, items } = useTrophyData()
  const won = useMemo(() => {
    const out: { chore: Chore; months: Month[]; best: number }[] = []
    for (const month of monthsWithActivity(todos, items)) {
      for (const w of trophies(todos, items, month)) {
        if (w.winner !== personId) continue
        const row = out.find((r) => r.chore === w.chore)
        if (row) row.months.push(month)
        else out.push({ chore: w.chore, months: [month], best: 0 })
      }
    }
    for (const r of out) r.best = Math.max(...r.months.map((m) => streakOf(todos, items, r.chore, personId, m)))
    return out
  }, [todos, items, personId])

  return (
    <section style={{ alignSelf: 'stretch', marginTop: 34 }}>
      <Hand as="h2" size={34} lineHeight={36} style={{ margin: 0 }}>
        {t('trophies.case')}
      </Hand>
      {won.length ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '18px 12px', marginTop: 12 }}>
          {won.map((r) => (
            <div key={r.chore} style={{ textAlign: 'center' }} title={r.months.map((m) => monthName(m, i18n.language)).join(', ')}>
              <Trophy chore={r.chore} big={r.best >= 3} size={84} />
              <div style={{ fontSize: 13, fontWeight: 800, lineHeight: '16px', marginTop: 2 }}>{r.best >= 3 ? t(`trophies.big.${r.chore}`) : t(`trophies.names.${r.chore}`)}</div>
              <div className="cap" style={{ fontSize: 12 }}>
                {r.months.length > 1 ? t('trophies.wonTimes', { count: r.months.length }) : monthName(r.months[0], i18n.language)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="cap" style={{ fontSize: 14, padding: '6px 0' }}>{t('trophies.caseEmpty')}</div>
      )}
    </section>
  )
}
