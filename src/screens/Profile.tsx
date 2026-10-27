import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth, useMe } from '../auth'
import { supabase } from '../lib/supabase'
import { db } from '../data/store'
import { useMyProfile, type Avatar as AvatarData } from '../data/hooks'
import { Screen } from '../components/Shell'
import { ACCESSORIES, Avatar, CHARACTERS, COLORS, COLOR_HEX } from '../components/Avatar'
import { Hand } from '../components/Scrapbook'
import { BackIcon } from '../components/Icons'
import { LangSwitch } from '../components/LangSwitch'

type Step = 'character' | 'color' | 'extra'
const STEPS: Step[] = ['character', 'color', 'extra']

function Arrow({ dir, onClick, label }: { dir: -1 | 1; onClick: () => void; label: string }) {
  return (
    <button type="button" className="stk sec round" aria-label={label} onClick={onClick} style={{ width: 52, height: 52, transform: `rotate(${dir * 3}deg)` }}>
      <span style={{ display: 'flex', transform: dir === 1 ? 'scaleX(-1)' : undefined }}>
        <BackIcon size={24} />
      </span>
    </button>
  )
}

/** Profile and avatar: Character, then Color, then Extra (accessory). */
export function ProfileScreen() {
  const { t } = useTranslation()
  const me = useMe()
  const navigate = useNavigate()
  const profile = useMyProfile()
  const [step, setStep] = useState<Step>('character')
  const [avatar, setAvatar] = useState<AvatarData>(() => ({ character: 'onigiri', color: 'blush', accessory: null, ...profile?.avatar }))
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const stepIndex = STEPS.indexOf(step)

  const charIndex = Math.max(0, CHARACTERS.indexOf(avatar.character as (typeof CHARACTERS)[number]))
  const accIndex = Math.max(0, ACCESSORIES.indexOf((avatar.accessory ?? 'none') as (typeof ACCESSORIES)[number]))

  function cycle(dir: -1 | 1) {
    if (step === 'character') {
      setAvatar((a) => ({ ...a, character: CHARACTERS[(charIndex + dir + CHARACTERS.length) % CHARACTERS.length] }))
    } else {
      const next = ACCESSORIES[(accIndex + dir + ACCESSORIES.length) % ACCESSORIES.length]
      setAvatar((a) => ({ ...a, accessory: next === 'none' ? null : next }))
    }
  }

  function save() {
    db.update('profiles', me, { avatar, display_name: displayName.trim() || profile?.display_name || '' })
    navigate(-1)
  }

  const caption =
    step === 'color'
      ? t(`profile.colors.${avatar.color}`)
      : step === 'extra'
        ? t(`profile.accessories.${avatar.accessory ?? 'none'}`)
        : t(`profile.characters.${avatar.character}`)
  const count = step === 'character' ? CHARACTERS.length : step === 'extra' ? ACCESSORIES.length : 0
  const at = step === 'character' ? charIndex : accIndex

  return (
    <Screen
      footer={
        <div style={{ position: 'relative', zIndex: 3, display: 'flex', gap: 12, padding: '12px 22px calc(var(--bottom) + 32px) 40px' }}>
          <button type="button" className="stk sec" style={{ flex: 1, transform: 'rotate(-1deg)' }} onClick={() => (stepIndex ? setStep(STEPS[stepIndex - 1]) : navigate(-1))}>
            {t('common.back')}
          </button>
          {stepIndex < STEPS.length - 1 ? (
            <button type="button" className="stk prim" style={{ flex: 1.8, transform: 'rotate(1deg)' }} onClick={() => setStep(STEPS[stepIndex + 1])}>
              {t('profile.next', { step: t(`profile.${STEPS[stepIndex + 1]}`) })}
            </button>
          ) : (
            <button type="button" className="stk prim" style={{ flex: 1.8, transform: 'rotate(1deg)' }} onClick={save}>
              {t('common.save')}
            </button>
          )}
        </div>
      }
    >
      <div style={{ padding: 'calc(var(--top) + 8px) 22px 0 40px' }}>
        <div className="row" style={{ gap: 6, marginLeft: -10 }}>
          <button type="button" aria-label={t('common.back')} onClick={() => navigate(-1)} style={{ display: 'flex', color: '#1E1A30' }}>
            <BackIcon />
          </button>
          <Hand as="h1" style={{ margin: 0 }}>
            {t('profile.title')}
          </Hand>
        </div>

        <div role="tablist" className="row" style={{ marginTop: 16, gap: 6 }}>
          {STEPS.map((s, i) => (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={step === s}
              onClick={() => setStep(s)}
              className={step === s ? 'tp' : undefined}
              style={{
                flex: 1,
                height: 32,
                textAlign: 'center',
                fontSize: 14,
                fontWeight: step === s ? 800 : 700,
                color: step === s ? '#1E1A30' : '#857A8C',
                transform: step === s ? `rotate(${i % 2 ? 1.5 : -1.5}deg)` : undefined,
                boxShadow: step === s ? '1px 2px 0 rgba(30,26,48,.12)' : 'inset 0 -2px 0 #E6DFE3',
              }}
            >
              {t(`profile.${s}`)}
            </button>
          ))}
        </div>

        <div className="row" style={{ justifyContent: 'center', gap: 10, marginTop: 28 }}>
          {step !== 'color' && <Arrow dir={-1} onClick={() => cycle(-1)} label={t('profile.previous')} />}
          <Avatar avatar={avatar} size={190} label={caption} className="" style={{ filter: 'drop-shadow(2px 4px 0 rgba(30,26,48,.12))' }} />
          {step !== 'color' && <Arrow dir={1} onClick={() => cycle(1)} label={t('profile.nextOne')} />}
        </div>
        <div style={{ textAlign: 'center', marginTop: 14, fontSize: 22, lineHeight: '28px', fontWeight: 800, color: '#1E1A30' }}>{caption}</div>

        {count > 0 && (
          <div className="row" style={{ justifyContent: 'center', gap: 6, marginTop: 10 }} aria-hidden>
            {Array.from({ length: count }, (_, i) => (
              <span key={i} style={{ width: i === at ? 18 : 8, height: 8, borderRadius: 4, background: i === at ? '#A8335A' : '#CBC2CC' }} />
            ))}
          </div>
        )}

        {step === 'color' && (
          <div role="radiogroup" aria-label={t('profile.color')} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginTop: 22, justifyItems: 'center' }}>
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={avatar.color === c}
                aria-label={t(`profile.colors.${c}`)}
                onClick={() => setAvatar((a) => ({ ...a, color: c }))}
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: COLOR_HEX[c],
                  boxShadow: avatar.color === c ? '0 0 0 3px #FFFFFF, 0 0 0 5px #1E1A30' : '0 0 0 2px #FFFFFF, 1px 2px 2px 1px rgba(30,26,48,.15)',
                }}
              />
            ))}
          </div>
        )}

        {step === 'character' && (
          <div style={{ marginTop: 26 }}>
            <label className="label" htmlFor="display-name">
              {t('profile.name')}
            </label>
            <input id="display-name" className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} autoComplete="nickname" />
          </div>
        )}
      </div>
    </Screen>
  )
}

export function SettingsScreen() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const profile = useMyProfile()
  const email = useAuth().session?.user.email ?? ''

  return (
    <Screen>
      <div style={{ padding: 'calc(var(--top) + 8px) 22px 32px 40px', display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div className="row" style={{ gap: 6, marginLeft: -10 }}>
          <button type="button" aria-label={t('common.back')} onClick={() => navigate(-1)} style={{ display: 'flex', color: '#1E1A30' }}>
            <BackIcon />
          </button>
          <Hand as="h1" style={{ margin: 0 }}>
            {t('settings.title')}
          </Hand>
        </div>

        <Link to="/profile" className="note n-blush row" style={{ gap: 14, transform: 'rotate(-.6deg)', padding: '14px 16px' }}>
          <Avatar avatar={profile?.avatar} size={56} />
          <span className="grow">
            <span style={{ display: 'block', fontSize: 18, fontWeight: 800, color: '#1E1A30' }}>{profile?.display_name}</span>
            <span className="cap" style={{ fontSize: 14 }}>
              {t('settings.changeCharacter')}
            </span>
          </span>
          <span style={{ display: 'flex', transform: 'scaleX(-1)', color: '#63586B' }}>
            <BackIcon size={22} />
          </span>
        </Link>

        <section>
          <Hand size={30} lineHeight={32}>
            {t('settings.language')}
          </Hand>
          <div className="row" style={{ justifyContent: 'space-between', marginTop: 8 }}>
            <span className="body">{t('settings.appLanguage')}</span>
            <LangSwitch />
          </div>
        </section>

        <div className="row" style={{ justifyContent: 'space-between', gap: 12, marginTop: 6 }}>
          <span className="cap" style={{ fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {email}
          </span>
          <button type="button" className="stk sec sm" style={{ transform: 'rotate(1.5deg)' }} onClick={() => supabase.auth.signOut()}>
            {t('settings.logOut')}
          </button>
        </div>
      </div>
    </Screen>
  )
}
