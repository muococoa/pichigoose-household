// Mentions (Nora, 30 Oct): type @ in a comment or the chat to tag someone in the household. Tags are plain text
// ("@Danko"), so nothing new is stored: the app finds them by looking for "@" plus someone's name.

/** The "@Dan" being typed at the end of the text, if any: what to search names for. */
export function typingMention(text: string) {
  const m = /(^|\s)@([\p{L}\p{N}._-]*)$/u.exec(text)
  return m ? m[2] : null
}

/** Swap the "@Dan" being typed for the chosen name, ready to keep typing. */
export function insertMention(text: string, name: string) {
  return text.replace(/@([\p{L}\p{N}._-]*)$/u, `@${name} `)
}

/** Does this text tag `name`? "@Danko" counts, "@Dankos" doesn't. */
export function mentions(text: string, name: string) {
  if (!name.trim()) return false
  const at = text.toLocaleLowerCase().indexOf(`@${name.toLocaleLowerCase()}`)
  if (at < 0) return false
  const next = text[at + name.length + 1]
  return next === undefined || !/[\p{L}\p{N}]/u.test(next)
}

// Which tags you've already seen or closed, kept on this device.
const KEY = 'pichigoose.mentions.seen'
export function seenMentions(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as string[]
  } catch {
    return []
  }
}
export function markMentionSeen(id: string) {
  try {
    localStorage.setItem(KEY, JSON.stringify([id, ...seenMentions().filter((x) => x !== id)].slice(0, 300)))
  } catch {
    // ignore
  }
}
