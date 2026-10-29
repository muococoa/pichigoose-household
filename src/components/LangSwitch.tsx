import { useTranslation } from 'react-i18next'
import { setLanguage, type Language } from '../i18n'
import { db } from '../data/store'
import { useAuth } from '../auth'
import { Toggle } from './Toggle'

/** SR | EN. Also saves the choice to your profile when you're signed in. */
export function LangSwitch() {
  const { i18n, t } = useTranslation()
  const { session } = useAuth()
  const current = i18n.language === 'sr' ? 'sr' : 'en'

  function pick(lang: Language) {
    // The words settle in with a soft blur, so the switch feels like ink, not a page reload.
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.getElementById('root')?.animate([{ opacity: 0.35, filter: 'blur(2px)' }, { opacity: 1, filter: 'blur(0)' }], { duration: 380, easing: 'cubic-bezier(.2,.8,.2,1)' })
    }
    setLanguage(lang)
    if (session) db.update('profiles', session.user.id, { language: lang })
  }

  return (
    <Toggle
      label={t('settings.appLanguage')}
      value={current}
      onChange={pick}
      options={[
        { value: 'sr', label: 'SR' },
        { value: 'en', label: 'EN' },
      ]}
    />
  )
}
