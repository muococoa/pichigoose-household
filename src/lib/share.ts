import { showToast } from '../components/Scrapbook'

// Sending a household's join link.

export function joinLink(address: string) {
  return `${window.location.origin}/join/${address}`
}

export async function copyText(text: string, done: string) {
  try {
    await navigator.clipboard.writeText(text)
    showToast(done)
  } catch {
    window.prompt('', text)
  }
}

export async function shareAddress(address: string, text: string, copied: string) {
  const link = joinLink(address)
  if (navigator.share) {
    try {
      await navigator.share({ text })
      return
    } catch {
      return
    }
  }
  await copyText(link, copied)
}
