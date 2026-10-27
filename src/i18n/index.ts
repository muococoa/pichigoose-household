import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './en.json'
import sr from './sr.json'

export type Language = 'en' | 'sr'

const LANG_KEY = 'pichigoose.language'

function savedLanguage(): Language {
  try {
    return localStorage.getItem(LANG_KEY) === 'sr' ? 'sr' : 'en'
  } catch {
    return 'en'
  }
}

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, sr: { translation: sr } },
  lng: savedLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

export function setLanguage(lang: Language) {
  try {
    localStorage.setItem(LANG_KEY, lang)
  } catch {
    // ignore
  }
  document.documentElement.lang = lang
  void i18n.changeLanguage(lang)
}

/** The locale for dates and numbers. Serbian in Latin script. */
export function locale(lang: string) {
  return lang === 'sr' ? 'sr-Latn-RS' : 'en-US'
}

export default i18n
