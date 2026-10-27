import { useTranslation } from 'react-i18next'
import { setLanguage, type Language } from '../i18n'
import { db } from '../data/store'
import { useAuth } from '../auth'

/** SR | EN. Also saves the choice to your profile when you're signed in. */
export function LangSwitch() {
  const { i18n, t } = useTranslation()
  const { session } = useAuth()
  const current = i18n.language === 'sr' ? 'sr' : 'en'

  function pick(lang: Language) {
    setLanguage(lang)
    if (session) db.update('profiles', session.user.id, { language: lang })
  }

  return (
    <div
      role="radiogroup"
      aria-label={t('settings.appLanguage')}
      style={{
        display: 'inline-flex',
        borderRadius: '8px 14px 10px 12px',
        boxShadow: 'inset 0 0 0 2px #D6C8E6',
        background: '#FFFFFF',
        padding: 3,
        gap: 2,
        flex: 'none',
      }}
    >
      {(['sr', 'en'] as const).map((lang) => (
        <button
          key={lang}
          type="button"
          role="radio"
          aria-checked={current === lang}
          onClick={() => pick(lang)}
          style={{
            height: 34,
            minWidth: 44,
            padding: '0 10px',
            borderRadius: '6px 10px 8px 10px',
            fontWeight: 800,
            fontSize: 14,
            textAlign: 'center',
            background: current === lang ? '#A8335A' : 'transparent',
            color: current === lang ? '#FFFFFF' : '#463D50',
          }}
        >
          {lang.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
