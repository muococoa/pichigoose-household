import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { refetchAll } from '../data/store'
import { setCurrentHousehold, useHousehold } from '../data/hooks'
import { Screen } from '../components/Shell'
import { Hand, Tape } from '../components/Scrapbook'
import { BackIcon } from '../components/Icons'

const PENDING_KEY = 'pichigoose.joinAddress'

export function rememberJoinAddress(address: string) {
  try {
    localStorage.setItem(PENDING_KEY, address)
  } catch {
    // ignore
  }
}

function takeJoinAddress() {
  try {
    const a = localStorage.getItem(PENDING_KEY)
    localStorage.removeItem(PENDING_KEY)
    return a ?? ''
  } catch {
    return ''
  }
}

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
      {on && <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#D34471' }} />}
    </span>
  )
}

export function JoinOrCreateScreen() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { households } = useHousehold()
  const [pending] = useState(takeJoinAddress)
  const [mode, setMode] = useState<'join' | 'create'>(params.get('mode') === 'create' ? 'create' : 'join')
  const [label, setLabel] = useState('')
  const [address, setAddress] = useState(pending)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function join(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { data, error } = await supabase.rpc('join_household', { address, label })
    setBusy(false)
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
    setBusy(true)
    setError('')
    const householdName = name.trim() || t('join.namePlaceholder')
    const { data, error } = await supabase.rpc('create_household', { household_name: householdName, first_list_name: t('join.firstList') })
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
    <Screen>
      <div className="pad top" style={{ paddingBottom: 40 }}>
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

        <div className="note n-butter" style={{ transform: 'rotate(-.8deg)', opacity: mode === 'join' ? 1 : 0.7 }}>
          <Tape kind="tm" style={{ top: -10, left: 26, transform: 'rotate(-4deg)' }} />
          <button type="button" className="row" onClick={() => setMode('join')} aria-pressed={mode === 'join'} style={{ width: '100%', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
            <Hand size={30} lineHeight={32}>
              {t('join.join')}
            </Hand>
            <Radio on={mode === 'join'} />
          </button>
          {mode === 'join' && (
            <form onSubmit={join} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14, position: 'relative', zIndex: 1 }}>
              <div>
                <label className="label" htmlFor="label">
                  {t('join.whatCall')}
                </label>
                <input id="label" className="input" placeholder={t('join.whatCallPlaceholder')} value={label} onChange={(e) => setLabel(e.target.value)} />
              </div>
              <div>
                <label className="label" htmlFor="address">
                  {t('join.address')}
                </label>
                <input
                  id="address"
                  className="input"
                  required
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder={t('join.addressPlaceholder')}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
                <p className="cap" style={{ margin: '8px 0 0' }}>
                  {t('join.orLink')}
                </p>
              </div>
              {error && <p className="err" role="alert" style={{ margin: 0 }}>{error}</p>}
              <button type="submit" className="stk prim" disabled={busy} style={{ width: '100%', transform: 'rotate(1deg)' }}>
                {t('join.join')}
              </button>
            </form>
          )}
        </div>

        <div className="note n-sage" style={{ transform: 'rotate(.7deg)', marginTop: 30, opacity: mode === 'create' ? 1 : 0.7 }}>
          <Tape kind="tdots" style={{ top: -10, right: 30, transform: 'rotate(5deg)' }} />
          <button type="button" className="row" onClick={() => setMode('create')} aria-pressed={mode === 'create'} style={{ width: '100%', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
            <Hand size={30} lineHeight={32}>
              {t('join.createNew')}
            </Hand>
            <Radio on={mode === 'create'} />
          </button>
          <p className="body" style={{ margin: '8px 0 0', position: 'relative', zIndex: 1 }}>
            {t('join.createText')}
          </p>
          {mode === 'create' && (
            <form onSubmit={create} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14, position: 'relative', zIndex: 1 }}>
              <div>
                <label className="label" htmlFor="hname">
                  {t('join.name')}
                </label>
                <input id="hname" className="input" placeholder={t('join.namePlaceholder')} value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              {error && <p className="err" role="alert" style={{ margin: 0 }}>{error}</p>}
              <button type="submit" className="stk prim" disabled={busy} style={{ width: '100%', transform: 'rotate(-1deg)' }}>
                {t('join.create')}
              </button>
            </form>
          )}
        </div>
      </div>
    </Screen>
  )
}
