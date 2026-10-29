import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth, useMe } from '../auth'
import { supabase } from '../lib/supabase'
import { db } from '../data/store'
import { useMyProfile, type Avatar as AvatarData } from '../data/hooks'
import { Screen } from '../components/Shell'
import { ACCESSORIES, Avatar, CHARACTERS, COLORS, COLOR_HEX } from '../components/Avatar'
import { Hand } from '../components/Scrapbook'
import { BackIcon, PencilIcon } from '../components/Icons'
import { LangSwitch } from '../components/LangSwitch'
import { useDesktop } from '../lib/desktop'
import { THEMES } from '../lib/theme'
import { dropTheme } from '../lib/themeDrop'
import { useBack, useBackInApp } from '../lib/back'

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
  const back = useBackInApp('/settings')
  const profile = useMyProfile()
  const [step, setStep] = useState<Step>('character')
  const [avatar, setAvatar] = useState<AvatarData>(() => ({ character: 'onigiri', color: 'blush', accessory: null, ...profile?.avatar }))
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const stepIndex = STEPS.indexOf(step)
  const desktop = useDesktop()

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
    back()
  }

  const caption =
    step === 'color'
      ? t(`profile.colors.${avatar.color}`)
      : step === 'extra'
        ? t(`profile.accessories.${avatar.accessory ?? 'none'}`)
        : t(`profile.characters.${avatar.character}`)
  const count = step === 'character' ? CHARACTERS.length : step === 'extra' ? ACCESSORIES.length : 0
  const at = step === 'character' ? charIndex : accIndex

  if (desktop) {
    // Desktop (D9): the big preview on the left; on the right the steps as tabs, with every option
    // shown at once so it can be clicked directly, the name, and the buttons.
    const options =
      step === 'character'
        ? CHARACTERS.map((c) => ({ key: c, on: avatar.character === c, label: t(`profile.characters.${c}`), preview: { ...avatar, character: c }, pick: () => setAvatar((a) => ({ ...a, character: c })) }))
        : step === 'extra'
          ? ACCESSORIES.map((x) => ({
              key: x,
              on: (avatar.accessory ?? 'none') === x,
              label: t(`profile.accessories.${x}`),
              preview: { ...avatar, accessory: x === 'none' ? null : x },
              pick: () => setAvatar((a) => ({ ...a, accessory: x === 'none' ? null : x })),
            }))
          : []
    return (
      <Screen wide>
        <div style={{ padding: 'var(--top) 22px 32px 40px' }}>
          <div className="row" style={{ gap: 6, marginLeft: -10 }}>
            <button type="button" aria-label={t('common.back')} onClick={back} style={{ display: 'flex', color: '#1E1A30' }}>
              <BackIcon />
            </button>
            <Hand as="h1" style={{ margin: 0 }}>
              {t('profile.title')}
            </Hand>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', columnGap: 56, rowGap: 32, alignItems: 'flex-start', marginTop: 28 }}>
            <div style={{ flex: 'none', width: 380, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div className="row" style={{ gap: 14 }}>
                {step !== 'color' && <Arrow dir={-1} onClick={() => cycle(-1)} label={t('profile.previous')} />}
                <Avatar full avatar={avatar} size={240} label={caption} className="" style={{ filter: 'drop-shadow(2px 4px 0 rgba(30,26,48,.12))' }} />
                {step !== 'color' && <Arrow dir={1} onClick={() => cycle(1)} label={t('profile.nextOne')} />}
              </div>
              <div style={{ marginTop: 16, fontSize: 24, lineHeight: '30px', fontWeight: 800, color: '#1E1A30' }}>{caption}</div>
              {count > 0 && (
                <div className="row" style={{ justifyContent: 'center', gap: 6, marginTop: 10 }} aria-hidden>
                  {Array.from({ length: count }, (_, i) => (
                    <span key={i} style={{ width: i === at ? 18 : 8, height: 8, borderRadius: 4, background: i === at ? 'var(--hero-dark)' : '#CBC2CC' }} />
                  ))}
                </div>
              )}
            </div>
            <div style={{ flex: '1 1 340px', minWidth: 0, maxWidth: 560 }}>
              <div role="tablist" className="row" style={{ gap: 6 }}>
                {STEPS.map((x, i) => (
                  <button
                    key={x}
                    type="button"
                    role="tab"
                    aria-selected={step === x}
                    onClick={() => setStep(x)}
                    className={step === x ? 'tp' : undefined}
                    style={{
                      flex: 1,
                      height: 34,
                      textAlign: 'center',
                      fontSize: 15,
                      fontWeight: step === x ? 800 : 700,
                      color: step === x ? '#1E1A30' : '#857A8C',
                      transform: step === x ? `rotate(${i % 2 ? 1.5 : -1.5}deg)` : undefined,
                      boxShadow: step === x ? '1px 2px 0 rgba(30,26,48,.12)' : 'inset 0 -2px 0 #E6DFE3',
                    }}
                  >
                    {t(`profile.${x}`)}
                  </button>
                ))}
              </div>
              {step === 'color' ? (
                <div role="radiogroup" aria-label={t('profile.color')} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18, marginTop: 24, justifyItems: 'center' }}>
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      role="radio"
                      aria-checked={avatar.color === c}
                      aria-label={t(`profile.colors.${c}`)}
                      onClick={() => setAvatar((a) => ({ ...a, color: c }))}
                      style={{
                        width: 60,
                        height: 60,
                        borderRadius: '50%',
                        background: COLOR_HEX[c],
                        boxShadow: avatar.color === c ? '0 0 0 3px #FFFFFF, 0 0 0 5px #1E1A30' : '0 0 0 2px #FFFFFF, 1px 2px 2px 1px rgba(30,26,48,.15)',
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div role="radiogroup" aria-label={t(`profile.${step}`)} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginTop: 24 }}>
                  {options.map((o, i) => (
                    <button
                      key={o.key}
                      type="button"
                      role="radio"
                      aria-checked={o.on}
                      onClick={o.pick}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 8,
                        padding: '14px 6px 10px',
                        background: '#FFFFFF',
                        borderRadius: '10px 14px 12px 10px',
                        transform: `rotate(${i % 2 ? 1 : -1}deg)`,
                        boxShadow: o.on ? 'inset 0 0 0 2px #1E1A30, 2px 3px 0 rgba(30,26,48,.10)' : '0 0 0 1px rgba(30,26,48,.08), 2px 3px 0 rgba(30,26,48,.08)',
                      }}
                    >
                      <Avatar full avatar={o.preview} size={56} className="" />
                      <span style={{ fontSize: 14, fontWeight: 800, color: '#1E1A30' }}>{o.label}</span>
                    </button>
                  ))}
                </div>
              )}
              {step === 'character' && (
                <div style={{ marginTop: 24 }}>
                  <label className="label" htmlFor="display-name">
                    {t('profile.name')}
                  </label>
                  <input id="display-name" className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} autoComplete="nickname" />
                </div>
              )}
              <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <button type="button" className="stk sec" style={{ flex: 1, transform: 'rotate(-1deg)' }} onClick={() => (stepIndex ? setStep(STEPS[stepIndex - 1]) : back())}>
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
              {stepIndex < STEPS.length - 1 && (
                <div style={{ textAlign: 'center', marginTop: 14 }}>
                  <button type="button" className="link" onClick={save} style={{ padding: '8px 12px' }}>
                    {t('profile.saveChanges')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </Screen>
    )
  }

  return (
    <Screen
      footer={
        <div style={{ position: 'relative', zIndex: 3, padding: '12px 22px calc(var(--bottom) + 24px) 40px' }}>
          <div style={{ display: 'flex', gap: 12 }}>
          <button type="button" className="stk sec" style={{ flex: 1, transform: 'rotate(-1deg)' }} onClick={() => (stepIndex ? setStep(STEPS[stepIndex - 1]) : back())}>
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
          {/* Changed just one thing? Save from any step. On the last step the big button already saves. */}
          <div style={{ height: 44, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            {stepIndex < STEPS.length - 1 && (
              <button type="button" className="link" onClick={save} style={{ padding: '8px 12px' }}>
                {t('profile.saveChanges')}
              </button>
            )}
          </div>
        </div>
      }
    >
      <div style={{ padding: 'calc(var(--top) + 8px) 22px 0 40px' }}>
        <div className="row" style={{ gap: 6, marginLeft: -10 }}>
          <button type="button" aria-label={t('common.back')} onClick={back} style={{ display: 'flex', color: '#1E1A30' }}>
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
          <Avatar full avatar={avatar} size={190} label={caption} className="" style={{ filter: 'drop-shadow(2px 4px 0 rgba(30,26,48,.12))' }} />
          {step !== 'color' && <Arrow dir={1} onClick={() => cycle(1)} label={t('profile.nextOne')} />}
        </div>
        <div style={{ textAlign: 'center', marginTop: 14, fontSize: 22, lineHeight: '28px', fontWeight: 800, color: '#1E1A30' }}>{caption}</div>

        {count > 0 && (
          <div className="row" style={{ justifyContent: 'center', gap: 6, marginTop: 10 }} aria-hidden>
            {Array.from({ length: count }, (_, i) => (
              <span key={i} style={{ width: i === at ? 18 : 8, height: 8, borderRadius: 4, background: i === at ? 'var(--hero-dark)' : '#CBC2CC' }} />
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
  const back = useBack()
  const me = useMe()
  const profile = useMyProfile()
  const email = useAuth().session?.user.email ?? ''

  return (
    <Screen center>
      <div style={{ padding: 'calc(var(--top) + 8px) 22px 32px 40px', display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div className="row" style={{ gap: 6, marginLeft: -10 }}>
          <button type="button" aria-label={t('common.back')} onClick={back} style={{ display: 'flex', color: '#1E1A30' }}>
            <BackIcon />
          </button>
          <Hand as="h1" style={{ margin: 0 }}>
            {t('settings.title')}
          </Hand>
        </div>

        {/* Your name opens your own profile (Nora, 29 Oct); changing your character has its own row under Theme. */}
        <Link to={`/people/${me}`} className="flag-note row" style={{ gap: 14, transform: 'rotate(-.6deg)' }}>
          {/* The note, cut into an arrow, and its boomerang-shaped end in the theme color. */}
          <span className="flag-bg" aria-hidden />
          <span className="flag-tip" aria-hidden />
          <Avatar avatar={profile?.avatar} size={56} />
          <span className="grow">
            <span style={{ display: 'block', fontSize: 18, fontWeight: 800, color: '#1E1A30' }}>{profile?.display_name}</span>
            <span className="cap" style={{ fontSize: 14 }}>
              {t('settings.yourProfile')}
            </span>
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

        <section>
          <Hand size={30} lineHeight={32}>
            {t('settings.theme')}
          </Hand>
          <div style={{ marginTop: 8 }}>
            <span className="body">
              {t('settings.appColor')}
              {/* The chosen theme's name, after one of the characters. */}
              <span className="cap" style={{ fontSize: 14, marginLeft: 8 }}>{t(`settings.themes.${profile?.theme ?? 'pichigoose'}`)}</span>
            </span>
            {/* Eight colors on one line. */}
            <div role="radiogroup" aria-label={t('settings.appColor')} className="row" style={{ justifyContent: 'space-between', gap: 6, marginTop: 10 }}>
              {THEMES.map((th) => {
                const on = (profile?.theme ?? 'pichigoose') === th.id
                return (
                  <button
                    key={th.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    aria-label={t(`settings.themes.${th.id}`)}
                    title={t(`settings.themes.${th.id}`)}
                    onClick={(e) => {
                      if (on) return
                      dropTheme(th.id, e.currentTarget, () => db.update('profiles', me, { theme: th.id }))
                    }}
                    style={{
                      width: 30,
                      height: 30,
                      flex: 'none',
                      borderRadius: '50%',
                      background: th.hex,
                      transition: 'box-shadow .35s ease',
                      boxShadow: on ? '0 0 0 3px #FFFFFF, 0 0 0 5px #1E1A30' : '0 0 0 2px #FFFFFF, 1px 2px 2px 1px rgba(30,26,48,.15)',
                    }}
                  />
                )
              })}
            </div>
          </div>
        </section>

        <Link to="/profile" className="row" style={{ justifyContent: 'space-between', gap: 12 }}>
          <span className="body">{t('settings.changeCharacter')}</span>
          <span className="stk sec sm" aria-hidden style={{ width: 38, padding: 0, transform: 'rotate(3deg)' }}>
            <PencilIcon />
          </span>
        </Link>

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
