import { showToast } from '../components/Scrapbook'

// Sending a household's join link. The link carries the secret password,
// so whoever gets it from you can join with one tap.

type Joinable = { address: string; secret?: string | null }

export function joinLink(h: Joinable) {
  const secret = h.secret ? `/${encodeURIComponent(h.secret.trim())}` : ''
  return `${window.location.origin}/join/${h.address}${secret}`
}

export async function copyText(text: string, done: string) {
  try {
    await navigator.clipboard.writeText(text)
    showToast(done)
  } catch {
    window.prompt('', text)
  }
}

export async function shareAddress(h: Joinable, text: string, copied: string) {
  if (navigator.share) {
    try {
      await navigator.share({ text })
      return
    } catch {
      return
    }
  }
  await copyText(joinLink(h), copied)
}
