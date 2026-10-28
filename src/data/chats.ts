import { useEffect, useMemo } from 'react'
import { useMe } from '../auth'
import { supabase } from '../lib/supabase'
import { refetchTable } from './store'
import { useChatReads, useHousehold, useMessages, type Message, type Profile } from './hooks'

/** A chat: the household's group chat ('household') or a private chat with one person (their id). */
export type Chat = { key: string; person: Profile | null; messages: Message[]; last: Message | undefined; unread: number }

export function inChat(m: Message, key: string, me: string) {
  if (key === 'household') return m.to_user === null
  return (m.author_id === me && m.to_user === key) || (m.author_id === key && m.to_user === me)
}

/** Every chat in the current household, with its messages and unread count. The group chat is always first. */
export function useChats() {
  const me = useMe()
  const { household, membership, people } = useHousehold()
  const hid = household?.id ?? null
  const messages = useMessages(hid)
  const reads = useChatReads(hid)
  return useMemo(() => {
    // Before you joined counts as read, so a new member doesn't start with a pile of unread messages.
    const since = membership?.joined_at ?? '1970-01-01'
    const make = (key: string, person: Profile | null): Chat => {
      const list = messages.rows.filter((m) => inChat(m, key, me)).sort((a, b) => a.created_at.localeCompare(b.created_at))
      const readAt = reads.rows.find((r) => r.chat === key)?.read_at ?? since
      const unread = list.filter((m) => m.author_id !== me && m.created_at > readAt).length
      return { key, person, messages: list, last: list[list.length - 1], unread }
    }
    const privateChats = people
      .filter((p) => p.id !== me)
      .map((p) => make(p.id, p))
      .sort((a, b) => (b.last?.created_at ?? '').localeCompare(a.last?.created_at ?? ''))
    return [make('household', null), ...privateChats]
  }, [messages.rows, reads.rows, people, me, membership?.joined_at])
}

/** Unread messages in the household chat, for the badge on the Messages tab. */
export function useUnreadTotal() {
  return useChats().find((c) => c.key === 'household')?.unread ?? 0
}

/** While a chat is open, keep it marked as read. */
export function useMarkRead(key: string | null, count: number) {
  const { household } = useHousehold()
  const hid = household?.id
  useEffect(() => {
    if (!key || !hid) return
    const timer = window.setTimeout(() => {
      void supabase.rpc('mark_chat_read', { hid, chat: key }).then(() => refetchTable('chat_reads'))
    }, 300)
    return () => window.clearTimeout(timer)
  }, [key, hid, count])
}
