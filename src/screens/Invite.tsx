import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth'
import { supabase } from '../lib/supabase'
import { refetchAll, useCollection, type Row } from '../data/store'
import { setCurrentHousehold, useHousehold, type Household } from '../data/hooks'
import { Hand, Sheet, Tape } from '../components/Scrapbook'
import { FieldError } from '../components/FieldError'
import { ShareIcon } from '../components/Icons'
import { joinLink, shareAddress } from '../lib/share'

type Invite = Row & {
  household_id: string
  email: string
  household_name: string
  inviter_name: string
  accepted_at: string | null
  declined_at: string | null
  created_at: string
}

type Result = { kind: 'sent' | 'notEmailed' | 'already'; email: string }

/** Invite someone by email, without leaving the app. */
export function InviteSheet({ household, onClose }: { household: Household | null; onClose: () => void }) {
  const { t, i18n } = useTranslation()
  const { name } = useHousehold()
  const [email, setEmail] = useState('')
  const [fieldErr, setFieldErr] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<Result | null>(null)

  // Start clean each time the sheet opens.
  useEffect(() => {
    setEmail('')
    setFieldErr('')
    setError('')
    setResult(null)
  }, [household?.id])

  async function send(e: FormEvent) {
    e.preventDefault()
    if (!household) return
    const mail = email.trim().toLowerCase()
    if (!mail) return setFieldErr(t('auth.errors.emailMissing'))
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) return setFieldErr(t('auth.errors.email'))
    setBusy(true)
    setError('')
    const { data, error } = await supabase.rpc('invite_to_household', { hid: household.id, invite_email: mail })
    if (error || !data) {
      setBusy(false)
      setError(navigator.onLine ? t('common.somethingWrong') : t('common.needsSignal'))
      return
    }
    const res = data as { status: 'invited' | 'already_member'; invite_id?: string }
    if (res.status === 'already_member') {
      setBusy(false)
      setResult({ kind: 'already', email: mail })
      return
    }
    // The invite is saved either way. The email is a nudge on top.
    const sent = await supabase.functions.invoke('send-invite', { body: { invite_id: res.invite_id, language: i18n.language } })
    setBusy(false)
    setResult({ kind: sent.error ? 'notEmailed' : 'sent', email: mail })
  }

  const householdName = household ? name(household) : ''

  return (
    <Sheet open={Boolean(household)} onClose={onClose} title={result?.kind === 'sent' ? t('invite.sent') : t('invite.title')}>
      {result ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p className="body" role="status" style={{ margin: '0 0 6px' }}>
            {result.kind === 'already'
              ? t('invite.already', { email: result.email, name: householdName })
              : result.kind === 'sent'
                ? t('invite.sentText', { email: result.email })
                : t('invite.notEmailed', { email: result.email })}
          </p>
          <button type="button" className="stk violet" style={{ width: '100%', transform: 'rotate(-1deg)' }} onClick={onClose}>
            {t('common.done')}
          </button>
          <button
            type="button"
            className="stk sec"
            style={{ width: '100%', transform: 'rotate(.6deg)' }}
            onClick={() => {
              setResult(null)
              setEmail('')
            }}
          >
            {t('invite.another')}
          </button>
        </div>
      ) : (
        <form noValidate onSubmit={send} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p className="body" style={{ margin: 0 }}>
            {t('invite.intro', { name: householdName })}
          </p>
          <div>
            <label className="label" htmlFor="invite-email">
              {t('invite.email')}
            </label>
            <input
              id="invite-email"
              className="input"
              type="email"
              inputMode="email"
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder={t('auth.emailPlaceholder')}
              value={email}
              aria-invalid={Boolean(fieldErr)}
              aria-describedby={fieldErr ? 'invite-email-err' : undefined}
              onChange={(e) => {
                setEmail(e.target.value)
                setFieldErr('')
              }}
            />
            {fieldErr && <FieldError id="invite-email-err">{fieldErr}</FieldError>}
          </div>
          {error && (
            <p className="err" role="alert" style={{ margin: 0 }}>
              {error}
            </p>
          )}
          <button type="submit" className="stk violet" disabled={busy} style={{ width: '100%', transform: 'rotate(-1deg)' }}>
            {t('invite.send')}
          </button>
          {household && (
            <button
              type="button"
              className="link"
              style={{ alignSelf: 'center', display: 'flex', alignItems: 'center', gap: 6, color: '#6A4F9C', marginTop: 2 }}
              onClick={() => shareAddress(household.address, t('created.shareText', { link: joinLink(household.address) }), t('common.copied'))}
            >
              <ShareIcon size={16} />
              {t('invite.orMessage')}
            </button>
          )}
        </form>
      )}
    </Sheet>
  )
}

/** Invites waiting for you, sent to the email you signed in with. */
function usePendingInvites() {
  const email = (useAuth().session?.user.email ?? '').toLowerCase()
  const { households } = useHousehold()
  const invites = useCollection<Invite>(
    email
      ? {
          key: `invites:${email}`,
          table: 'household_invites',
          belongs: (r) => r.email === email && !r.accepted_at && !r.declined_at,
          load: () => supabase.from('household_invites').select('*').eq('email', email).is('accepted_at', null).is('declined_at', null).order('created_at'),
          realtime: `email=eq.${email}`,
        }
      : null,
  )
  return useMemo(() => invites.rows.filter((i) => !households.some((h) => h.id === i.household_id)), [invites.rows, households])
}

/** "You're invited!" A card for each invite waiting for you, on Home and on the Welcome screen. */
export function PendingInvites({ style }: { style?: React.CSSProperties }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const invites = usePendingInvites()
  const [hidden, setHidden] = useState<string[]>([])
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  async function accept(i: Invite) {
    setBusy(i.id)
    setError('')
    const { data, error } = await supabase.rpc('accept_invite', { invite: i.id })
    setBusy('')
    if (error || !data) {
      setError(navigator.onLine ? t('common.somethingWrong') : t('common.needsSignal'))
      return
    }
    setHidden((h) => [...h, i.id])
    setCurrentHousehold(data as string)
    refetchAll()
    navigate('/', { replace: true })
  }

  async function decline(i: Invite) {
    setHidden((h) => [...h, i.id])
    await supabase.rpc('decline_invite', { invite: i.id })
  }

  const shown = invites.filter((i) => !hidden.includes(i.id))
  if (!shown.length) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 26, ...style }}>
      {shown.map((i, n) => (
        <div key={i.id} className="note n-lilac" style={{ transform: `rotate(${n % 2 ? 0.8 : -0.8}deg)` }}>
          <Tape kind="ttri" style={{ top: -10, left: 30, transform: 'rotate(-4deg)' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <Hand size={30} lineHeight={32}>
              {t('invite.invited')}
            </Hand>
            <p className="body" style={{ margin: '6px 0 16px' }}>
              {t('invite.card', { inviter: i.inviter_name || t('common.someone'), household: i.household_name })}
            </p>
            {error && (
              <p className="err" role="alert" style={{ margin: '0 0 12px' }}>
                {error}
              </p>
            )}
            <div className="row" style={{ gap: 12 }}>
              <button type="button" className="stk sec" style={{ flex: 1, transform: 'rotate(-1deg)' }} onClick={() => decline(i)}>
                {t('invite.noThanks')}
              </button>
              <button type="button" className="stk violet" disabled={busy === i.id} style={{ flex: 1.4, transform: 'rotate(1deg)' }} onClick={() => accept(i)}>
                {t('invite.join')}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
