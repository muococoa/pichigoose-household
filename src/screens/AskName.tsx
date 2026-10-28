import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth, useMe } from '../auth'
import { db } from '../data/store'
import { useMyProfile } from '../data/hooks'
import { Sheet } from '../components/Scrapbook'
import { FieldError } from '../components/FieldError'

/** New accounts start with a name made from the email ("Eleonora.Vojnovic"). That one doesn't count. */
function madeFromEmail(name: string, email: string) {
  return name.trim().toLowerCase() === email.split('@')[0].toLowerCase()
}

/** "What do we call you?" Asked right before joining a household, so the others see a real name. */
export function AskName({ open, onClose, onJoin }: { open: boolean; onClose: () => void; onJoin: () => void }) {
  const { t } = useTranslation()
  const me = useMe()
  const email = useAuth().session?.user.email ?? ''
  const profile = useMyProfile()
  const [name, setName] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!open) return
    const current = profile?.display_name ?? ''
    setName(madeFromEmail(current, email) ? '' : current)
    setErr('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function submit(e: FormEvent) {
    e.preventDefault()
    const clean = name.trim()
    if (!clean) {
      setErr(t('join.yourNameMissing'))
      return
    }
    if (clean !== profile?.display_name) db.update('profiles', me, { display_name: clean })
    onClose()
    onJoin()
  }

  return (
    <Sheet small open={open} onClose={onClose} title={t('join.whatCallYou')}>
      <form noValidate onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <input
            className="input"
            autoFocus
            autoComplete="given-name"
            aria-label={t('join.whatCallYou')}
            value={name}
            aria-invalid={Boolean(err)}
            aria-describedby={err ? 'your-name-err' : undefined}
            onChange={(e) => {
              setName(e.target.value)
              setErr('')
            }}
          />
          {err && <FieldError id="your-name-err">{err}</FieldError>}
        </div>
        <button type="submit" className="stk violet" style={{ width: '100%', transform: 'rotate(-1deg)' }}>
          {t('join.join')}
        </button>
      </form>
    </Sheet>
  )
}
