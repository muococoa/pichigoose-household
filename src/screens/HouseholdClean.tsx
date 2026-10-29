import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { refetchAll } from '../data/store'
import { useHousehold, type Household } from '../data/hooks'
import { PeekingPichi, PencilPichi, Sheet } from '../components/Scrapbook'
import { BroomIcon } from '../components/Icons'

/** "Can't right now": no signal, or something went wrong on the way. */
function useFailure() {
  const { t } = useTranslation()
  return () => (navigator.onLine ? t('common.somethingWrong') : t('common.needsSignal'))
}

/**
 * The broom on Arrange your home: a fresh start for the household. Empties the shopping lists,
 * to-dos, notes and both shelves (comments go with them). The chat, the people, the lists themselves
 * and the household's name, address and password stay. Asks first, because it can't be undone.
 */
export function CleanHouseholdButton({ size = 38 }: { size?: number }) {
  const { t } = useTranslation()
  const { household, name } = useHousehold()
  const failed = useFailure()
  const [asking, setAsking] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  // After cleaning, the same pop-up turns into "Fresh start!" with the happy goose.
  const [done, setDone] = useState(false)
  if (!household) return null
  const title = t('household.clean.title', { name: name(household) })

  async function clean() {
    if (!household) return
    setBusy(true)
    setError('')
    const { error } = await supabase.rpc('clean_household', { hid: household.id })
    setBusy(false)
    if (error) return setError(failed())
    await refetchAll()
    setDone(true)
  }

  return (
    <>
      <button type="button" className="stk sec sm" aria-label={title} title={title} style={{ width: size, padding: 0, flex: 'none', transform: 'rotate(2deg)' }} onClick={() => { setError(''); setDone(false); setAsking(true) }}>
        <BroomIcon />
      </button>
      <Sheet small open={asking} onClose={() => setAsking(false)} title={done ? t('household.clean.done') : title}>
        {done ? (
          <>
            <div style={{ margin: '0 0 18px' }}>
              <PencilPichi mood="happy" height={170} />
            </div>
            <button type="button" className="stk prim" style={{ width: '100%', transform: 'rotate(-1deg)' }} onClick={() => setAsking(false)}>
              {t('common.done')}
            </button>
          </>
        ) : (
        <>
        <div className="peek-wrap" style={{ position: 'relative' }}>
          <p className="body" style={{ margin: '0 0 18px', paddingRight: 44 }}>
            {t('household.clean.text')}
            <br />
            {t('pantry.clean.undo')}
          </p>
          <PeekingPichi mood="worried" style={{ right: -30, top: -14 }} />
        </div>
        {error && (
          <p className="err" role="alert" style={{ margin: '0 0 14px' }}>
            {error}
          </p>
        )}
        <div className="row" style={{ gap: 12 }}>
          <button type="button" className="stk sec" style={{ flex: 1, transform: 'rotate(-1deg)' }} onClick={() => setAsking(false)}>
            {t('common.cancel')}
          </button>
          <button type="button" className="stk prim" disabled={busy} style={{ flex: 1.4, transform: 'rotate(1deg)' }} onClick={clean}>
            {t('pantry.clean.button')}
          </button>
        </div>
        </>
        )}
      </Sheet>
    </>
  )
}

/** Delete household, in the household's menu (the danger zone, only for whoever created it): deletes
 *  the household and everything in it, chat included, for everyone. Asks first, in red, and you type
 *  the household's name to confirm. */
export function DeleteHouseholdSheet({ household, onClose, onDeleted }: { household: Household | null; onClose: () => void; onDeleted: (id: string) => void }) {
  const { t } = useTranslation()
  const { name } = useHousehold()
  const failed = useFailure()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  // To delete, you type the household's name (any capitals), so it can't happen by accident.
  const [typed, setTyped] = useState('')
  const shownName = household ? name(household) : ''
  const matches = Boolean(household) && [shownName, household?.name ?? ''].some((n) => n.trim().toLocaleLowerCase() === typed.trim().toLocaleLowerCase() && n.trim() !== '')

  async function remove() {
    if (!household || !matches) return
    setBusy(true)
    setError('')
    const { error } = await supabase.rpc('delete_household', { hid: household.id })
    setBusy(false)
    if (error) return setError(failed())
    setTyped('')
    onDeleted(household.id)
    void refetchAll()
  }

  return (
    <Sheet small open={Boolean(household)} onClose={() => { setError(''); setTyped(''); onClose() }} title={household ? t('household.delete.title', { name: shownName }) : ''}>
      <div className="peek-wrap" style={{ position: 'relative' }}>
        <p className="body" style={{ margin: '0 0 18px', paddingRight: 44 }}>
          {t('household.delete.text')}
          <br />
          {t('pantry.clean.undo')}
        </p>
        <PeekingPichi mood="very-worried" style={{ right: -30, top: -14 }} />
      </div>
      <label className="label" htmlFor="delete-name">
        {t('household.delete.typeName', { name: shownName })}
      </label>
      <input
        id="delete-name"
        className="input"
        autoComplete="off"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        placeholder={shownName}
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        style={{ marginBottom: 16 }}
      />
      {error && (
        <p className="err" role="alert" style={{ margin: '0 0 14px' }}>
          {error}
        </p>
      )}
      <div className="row" style={{ gap: 12 }}>
        <button type="button" className="stk sec" style={{ flex: 1, transform: 'rotate(-1deg)' }} onClick={() => { setTyped(''); onClose() }}>
          {t('common.cancel')}
        </button>
        <button type="button" className="stk prim danger" disabled={busy || !matches} style={{ flex: 1.4, transform: 'rotate(1deg)' }} onClick={remove}>
          {t('household.delete.button')}
        </button>
      </div>
    </Sheet>
  )
}
