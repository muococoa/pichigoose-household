import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { refetchAll } from '../data/store'
import { setCurrentHousehold, useHousehold } from '../data/hooks'
import { Screen } from '../components/Shell'
import { Hand, Sheet, Tape } from '../components/Scrapbook'
import { BackIcon } from '../components/Icons'
import { FieldError } from '../components/FieldError'
import { PendingInvites } from './Invite'
import { AskName } from './AskName'
import { useDesktop } from '../lib/desktop'

const PENDING_KEY = 'pichigoose.joinAddress'
const SECRET_KEY = 'pichigoose.joinSecret'

/** A join link was opened: keep its address (and the password it carries) until the Join screen. */
export function rememberJoinAddress(address: string, secret?: string) {
  try {
    localStorage.setItem(PENDING_KEY, address)
    if (secret) localStorage.setItem(SECRET_KEY, secret)
    else localStorage.removeItem(SECRET_KEY)
  } catch {
    // ignore
  }
}

function takeJoin() {
  try {
    const address = localStorage.getItem(PENDING_KEY) ?? ''
    const secret = localStorage.getItem(SECRET_KEY) ?? ''
    localStorage.removeItem(PENDING_KEY)
    localStorage.removeItem(SECRET_KEY)
    return { address, secret }
  } catch {
    return { address: '', secret: '' }
  }
}

// A suggested password for a new household. People can change it to anything.
const SUGGESTIONS = ['pancake', 'pickle', 'noodle', 'muffin', 'pretzel', 'waffle', 'dumpling', 'biscuit', 'teapot', 'mango']

function Radio({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      style={{
        width: 24,
        height: 24,
        borderRadius: '50%',
        border: '2px solid #1E1A30',
        background: '#FFFDF8',
        display: 'grid',
        placeItems: 'center',
        flex: 'none',
      }}
    >
      {on && <span style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--hero)' }} />}
    </span>
  )
}

export function JoinOrCreateScreen() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { households } = useHousehold()
  const [pending] = useState(takeJoin)
  const [mode, setMode] = useState<'join' | 'create'>(params.get('mode') === 'create' ? 'create' : 'join')
  const [address, setAddress] = useState(pending.address)
  // The password: from the join link, or typed in "Knock knock!".
  const [secret, setSecret] = useState(pending.secret)
  const [knocking, setKnocking] = useState(false)
  const [knockText, setKnockText] = useState('')
  const [knockErr, setKnockErr] = useState('')
  const [newSecret, setNewSecret] = useState(() => SUGGESTIONS[Math.floor(Math.random() * SUGGESTIONS.length)])
  const [newSecretErr, setNewSecretErr] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const [addressErr, setAddressErr] = useState('')
  const desktop = useDesktop()
  // Desktop (D2): both cards side by side and both open, so there's nothing to switch.
  const showJoin = desktop || mode === 'join'
  const showCreate = desktop || mode === 'create'

  // Joining: "Knock knock!" asks for the password (unless the link brought it),
  // then "What do we call you?", then in.
  const [askingName, setAskingName] = useState(false)

  function openKnock() {
    setKnockText('')
    setKnockErr('')
    setKnocking(true)
  }

  function join(e: FormEvent) {
    e.preventDefault()
    if (!address.trim()) {
      setAddressErr(t('join.addressMissing'))
      return
    }
    if (secret) setAskingName(true)
    else openKnock()
  }

  async function knock(e: FormEvent) {
    e.preventDefault()
    if (!knockText.trim()) {
      setKnockErr(t('join.secretWrong'))
      return
    }
    setBusy(true)
    const { data, error } = await supabase.rpc('check_household_secret', { address, secret: knockText })
    setBusy(false)
    if (error) {
      setKnockErr(navigator.onLine ? t('common.somethingWrong') : t('common.needsSignal'))
      return
    }
    if (data === 'not_found') {
      setKnocking(false)
      setAddressErr(t('join.notFound'))
      return
    }
    if (data !== 'ok') {
      setKnockErr(t('join.secretWrong'))
      return
    }
    setSecret(knockText)
    setKnocking(false)
    setAskingName(true)
  }

  async function joinNow() {
    setBusy(true)
    setError('')
    const { data, error } = await supabase.rpc('join_household', { address, label: '', secret })
    setBusy(false)
    if (error?.code === '28P01') {
      // The password changed since the link was sent. Ask for it.
      setSecret('')
      openKnock()
      return
    }
    if (error) {
      setError(error.code === 'P0002' ? t('join.notFound') : navigator.onLine ? t('common.somethingWrong') : t('common.needsSignal'))
      return
    }
    setCurrentHousehold(data as string)
    refetchAll()
    navigate('/', { replace: true })
  }

  async function create(e: FormEvent) {
    e.preventDefault()
    if (!newSecret.trim()) {
      setNewSecretErr(t('join.secretMissing'))
      return
    }
    setBusy(true)
    setError('')
    const householdName = name.trim() || t('join.namePlaceholder')
    const { data, error } = await supabase.rpc('create_household', { household_name: householdName, first_list_name: t('join.firstList'), secret: newSecret.trim() })
    setBusy(false)
    if (error || !data) {
      setError(navigator.onLine ? t('common.somethingWrong') : t('common.needsSignal'))
      return
    }
    const created = data as { id: string }
    setCurrentHousehold(created.id)
    refetchAll()
    navigate(`/created/${created.id}`, { replace: true })
  }

  return (
    <Screen wide={desktop}>
      <div className="pad top" style={{ paddingBottom: 40, ...(desktop ? { padding: '24px 0 40px', textAlign: 'center' } : {}) }}>
        {households.length > 0 && (
          <button type="button" aria-label={t('common.back')} onClick={() => navigate(-1)} style={{ display: 'flex', marginLeft: -10, marginBottom: 4, color: '#1E1A30' }}>
            <BackIcon />
          </button>
        )}
        <Hand as="h1" style={{ margin: 0 }}>
          {t('join.title')}
        </Hand>
        <p className="body" style={{ margin: '8px 0 26px' }}>
          {t('join.intro')}
        </p>

        <PendingInvites style={{ marginBottom: 30, ...(desktop ? { maxWidth: 520, margin: '0 auto 30px', textAlign: 'left' } : {}) }} />

        <div style={desktop ? { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 36, alignItems: 'start', textAlign: 'left', maxWidth: 900, margin: '10px auto 0' } : undefined}>

        <div className="note n-butter" style={{ transform: 'rotate(-.8deg)', opacity: showJoin ? 1 : 0.7 }}>
          <Tape kind="tm" style={{ top: -10, left: 26, transform: 'rotate(-4deg)' }} />
          <button type="button" className="row" onClick={() => setMode('join')} aria-pressed={mode === 'join'} style={{ width: '100%', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
            <Hand size={30} lineHeight={32}>
              {t('join.join')}
            </Hand>
            {!desktop && <Radio on={mode === 'join'} />}
          </button>
          {showJoin && (
            <form noValidate onSubmit={join} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14, position: 'relative', zIndex: 1 }}>
              <div>
                <label className="label" htmlFor="address">
                  {t('join.address')}
                </label>
                <input
                  id="address"
                  className="input"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder={t('join.addressPlaceholder')}
                  value={address}
                  aria-invalid={Boolean(addressErr)}
                  aria-describedby={addressErr ? 'address-err' : undefined}
                  onChange={(e) => {
                    setAddress(e.target.value)
                    setAddressErr('')
                  }}
                />
                {addressErr && <FieldError id="address-err">{addressErr}</FieldError>}
                <p className="cap" style={{ margin: '8px 0 0' }}>
                  {t('join.orLink')}
                </p>
              </div>
              {error && <p className="err" role="alert" style={{ margin: 0 }}>{error}</p>}
              <button type="submit" className="stk violet" disabled={busy} style={{ width: '100%', transform: 'rotate(1deg)' }}>
                {t('join.join')}
              </button>
            </form>
          )}
        </div>

        <div className="note n-sage" style={{ transform: 'rotate(.7deg)', marginTop: desktop ? 0 : 30, opacity: showCreate ? 1 : 0.7 }}>
          <Tape kind="tdots" style={{ top: -10, right: 30, transform: 'rotate(5deg)' }} />
          <button type="button" className="row" onClick={() => setMode('create')} aria-pressed={mode === 'create'} style={{ width: '100%', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
            <Hand size={30} lineHeight={32}>
              {t('join.createNew')}
            </Hand>
            {!desktop && <Radio on={mode === 'create'} />}
          </button>
          <p className="body" style={{ margin: '8px 0 0', position: 'relative', zIndex: 1 }}>
            {t('join.createText')}
          </p>
          {showCreate && (
            <form onSubmit={create} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14, position: 'relative', zIndex: 1 }}>
              <div>
                <label className="label" htmlFor="hname">
                  {t('join.name')}
                </label>
                <input id="hname" className="input" placeholder={t('join.namePlaceholder')} value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className="label" htmlFor="hsecret">
                  {t('join.secret')}
                </label>
                <input
                  id="hsecret"
                  className="input"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={newSecret}
                  aria-invalid={Boolean(newSecretErr)}
                  aria-describedby={newSecretErr ? 'hsecret-err' : undefined}
                  onChange={(e) => {
                    setNewSecret(e.target.value)
                    setNewSecretErr('')
                  }}
                />
                {newSecretErr && <FieldError id="hsecret-err">{newSecretErr}</FieldError>}
                <p className="cap" style={{ margin: '8px 0 0' }}>
                  {t('join.secretCreateHelp')}
                </p>
              </div>
              {error && <p className="err" role="alert" style={{ margin: 0 }}>{error}</p>}
              <button type="submit" className="stk prim" disabled={busy} style={{ width: '100%', transform: 'rotate(-1deg)' }}>
                {t('join.create')}
              </button>
            </form>
          )}
        </div>
        </div>
      </div>
      <Sheet small open={knocking} onClose={() => setKnocking(false)} title={t('join.knock')}>
        <form noValidate onSubmit={knock} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="label" htmlFor="knock">
              {t('join.secretQuestion')}
            </label>
            <input
              id="knock"
              className="input"
              autoFocus
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={knockText}
              aria-invalid={Boolean(knockErr)}
              aria-describedby={knockErr ? 'knock-err' : 'knock-help'}
              onChange={(e) => {
                setKnockText(e.target.value)
                setKnockErr('')
              }}
            />
            {knockErr && <FieldError id="knock-err">{knockErr}</FieldError>}
            <p id="knock-help" className="cap" style={{ margin: '8px 0 0' }}>
              {t('join.secretHelp')}
            </p>
          </div>
          <button type="submit" className="stk violet" disabled={busy} style={{ width: '100%', transform: 'rotate(-1deg)' }}>
            {t('join.join')}
          </button>
        </form>
      </Sheet>
      <AskName open={askingName} onClose={() => setAskingName(false)} onJoin={joinNow} />
    </Screen>
  )
}
