// The app's hero color, picked in Settings and saved on the profile (profiles.theme).
// The CSS for each theme is in scrapbook.css under html[data-theme].

export const THEMES = [
  { id: 'pichigoose', hex: '#D34471' },
  { id: 'blue', hex: '#3B6FA0' },
  { id: 'green', hex: '#5E8A45' },
  { id: 'orange', hex: '#D0643B' },
] as const

const KEY = 'pichigoose.theme'

export function applyTheme(theme: string | null | undefined) {
  const id = THEMES.some((x) => x.id === theme) ? (theme as string) : 'pichigoose'
  document.documentElement.dataset.theme = id
  try {
    localStorage.setItem(KEY, id)
  } catch {
    // ignore
  }
}

/** On start, before anything draws: the last theme used on this device, so there's no flash of pink. */
export function applySavedTheme() {
  try {
    applyTheme(localStorage.getItem(KEY))
  } catch {
    applyTheme(null)
  }
}
