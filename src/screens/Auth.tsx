import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { Screen } from '../components/Shell'
import { PichiPolaroid } from '../components/Scrapbook'
import { LangSwitch } from '../components/LangSwitch'
import logo from '../../assets/logo-pichigoose.png'

type Mode = 'signup' | 'login' | 'reset'

function errorKey(message: string) {
  const m = message.toLowerCase()
  if (m.includes('invalid login')) return 'auth.errors.invalid'
  if (m.includes('already registered') || m.includes('already been registered')) return 'auth.errors.taken'
  if (m.includes('password')) return 'auth.errors.weak'
  if (m.includes('email not confirmed')) return 'auth.errors.notConfirmed'
  if (m.includes('email')) return 'auth.errors.email'
  if (m.includes('fetch') || m.includes('network')) return 'common.needsSignal'
  return 'common.somethingWrong'
}

export function AuthScreen({ mode }: { mode: Mode }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setInfo('')
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { language: i18n.language }, emailRedirectTo: window.location.origin },
        })
        if (error) setError(t(errorKey(error.message)))
        else if (!data.session) setInfo(t('auth.checkEmail'))
        else navigate('/', { replace: true })
      } else if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) setError(t(errorKey(error.message)))
        else navigate('/', { replace: true })
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/new-password` })
        if (error) setError(t(errorKey(error.message)))
        else setInfo(t('auth.resetSent'))
      }
    } catch (err) {
      setError(t(errorKey(String(err))))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen>
      <div className="pad top" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', paddingBottom: 32 }}>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <LangSwitch />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 8 }}>
          <PichiPolaroid width={112} rotate={-4} />
          <img src={logo} alt="Pichigoose" style={{ width: 150, marginTop: 18 }} />
          <p className="body" style={{ textAlign: 'center', margin: '10px 0 0', color: '#463D50', maxWidth: 290 }}>
            {t('auth.tagline')}
          </p>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 26 }}>
          <div>
            <label className="label" htmlFor="email">
              {t('auth.email')}
            </label>
            <input
              id="email"
              className="input"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              placeholder={t('auth.emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {mode !== 'reset' && (
            <div>
              <label className="label" htmlFor="password">
                {t('auth.password')}
              </label>
              <input
                id="password"
                className="input"
                type="password"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                required
                minLength={6}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          )}
          {error && (
            <p className="err" role="alert" style={{ margin: 0 }}>
              {error}
            </p>
          )}
          {info && (
            <p className="body" role="status" style={{ margin: 0, color: '#4E6B39' }}>
              {info}
            </p>
          )}
          <button type="submit" className="stk prim" disabled={busy} style={{ width: '100%', transform: 'rotate(-1deg)', marginTop: 4 }}>
            {mode === 'signup' ? t('auth.createAccount') : mode === 'login' ? t('auth.logIn') : t('auth.sendLink')}
          </button>
        </form>

        <p className="body" style={{ textAlign: 'center', marginTop: 22 }}>
          {mode === 'signup' ? (
            <>
              {t('auth.haveAccount')}{' '}
              <Link className="link" to="/login">
                {t('auth.logIn')}
              </Link>
            </>
          ) : (
            <>
              {t('auth.newHere')}{' '}
              <Link className="link" to="/signup">
                {t('auth.signUpLink')}
              </Link>
            </>
          )}
        </p>
        {mode === 'login' && (
          <p className="body" style={{ textAlign: 'center', margin: 0 }}>
            <Link className="link" to="/reset">
              {t('auth.forgot')}
            </Link>
          </p>
        )}
      </div>
    </Screen>
  )
}

/** After tapping the email link to set a new password. */
export function NewPasswordScreen() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) setError(t(errorKey(error.message)))
    else navigate('/', { replace: true })
  }

  return (
    <Screen>
      <form className="pad top" onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 'calc(var(--top) + 60px)' }}>
        <label className="label" htmlFor="new-password">
          {t('auth.newPassword')}
        </label>
        <input
          id="new-password"
          className="input"
          type="password"
          autoComplete="new-password"
          minLength={6}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="err">{error}</p>}
        <button type="submit" className="stk prim" disabled={busy} style={{ width: '100%' }}>
          {t('auth.setPassword')}
        </button>
      </form>
    </Screen>
  )
}
