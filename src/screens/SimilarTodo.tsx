import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Todo } from '../data/hooks'
import { PichiSays } from '../components/PichiSays'
import { ago } from '../lib/time'
import type { Similar } from '../lib/similar'
import { Chip } from './Todos'

/**
 * Pichi asks before a copy lands on the list (Nora, 30 Oct). If the same to-do is already open, she says so.
 * If it was done before, she shows the closest ones to bring back for today, and offers to make it repeat, so it
 * comes back by itself next time. "Add as new" always stays possible.
 */
export function SimilarTodo({
  similar,
  onBringBack,
  onAddAnyway,
  onClose,
}: {
  similar: Similar | null
  onBringBack: (from: Todo, repeat: Todo['repeat']) => void
  onAddAnyway: () => void
  onClose: () => void
}) {
  const { t, i18n } = useTranslation()
  const [repeat, setRepeat] = useState<Todo['repeat']>(null)
  const open = similar?.open
  const repeats: { value: Todo['repeat']; label: string }[] = [
    { value: null, label: t('todos.repeatNo') },
    { value: 'daily', label: t('todos.repeatDaily') },
    { value: 'weekly', label: t('todos.repeatWeekly') },
    { value: 'monthly', label: t('todos.repeatMonthly') },
  ]

  return (
    <PichiSays open={Boolean(similar)} onClose={onClose} pose={open ? 'honk' : 'stand'} title={open ? t('similar.alreadyTitle') : t('similar.title')}>
      <p className="body" style={{ margin: '0 0 12px' }}>
        {open ? t('similar.alreadyText', { title: open.title }) : t('similar.text')}
      </p>

      {!open && similar && (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {similar.done.map((x) => (
              <div key={x.id} className="ln" style={{ minHeight: 52, gap: 10 }}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 16, fontWeight: 700 }}>{x.title}</span>
                  <span className="cap">{t('similar.doneWhen', { when: ago(x.done_at as string, i18n.language) })}</span>
                </span>
                <button type="button" className="stk prim sm" style={{ flex: 'none', transform: 'rotate(-1.5deg)' }} onClick={() => onBringBack(x, repeat)}>
                  {t('similar.bringBack')}
                </button>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16 }}>
            <span className="label">{t('similar.repeat')}</span>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              {repeats.map((r) => (
                <Chip key={r.value ?? 'no'} on={repeat === r.value} onClick={() => setRepeat(r.value)}>
                  {r.label}
                </Chip>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="row" style={{ gap: 12, marginTop: 20 }}>
        {open && (
          <button type="button" className="stk prim" style={{ flex: 1.4, transform: 'rotate(-1deg)' }} onClick={onClose}>
            {t('similar.keep')}
          </button>
        )}
        <button type="button" className={open ? 'stk sec' : 'link'} style={open ? { flex: 1, transform: 'rotate(1deg)' } : { margin: '0 auto', padding: '8px 12px' }} onClick={onAddAnyway}>
          {t('similar.addAnyway')}
        </button>
      </div>
    </PichiSays>
  )
}
