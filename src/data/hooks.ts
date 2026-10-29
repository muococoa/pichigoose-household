import { useMemo, useSyncExternalStore } from 'react'
import { supabase } from '../lib/supabase'
import { useMe } from '../auth'
import { useCollection, type Row } from './store'

export type Avatar = { character: string; color: string; accessory: string | null }

export type Profile = Row & {
  display_name: string
  avatar: Avatar
  language: 'en' | 'sr'
  theme: string
  track_money: boolean
}

export type Household = Row & { name: string; address: string; secret: string; kind: 'home' | 'event'; created_by?: string | null; created_at: string }

// pantry and bathroom are from before rooms: they stand for the first kitchen and bathroom room.
// Every room has its own note on Home: room:<id>.
export type Section = 'news' | 'shopping' | 'pantry' | 'bathroom' | 'todos' | 'money' | 'notes' | `room:${string}`
export type LayoutEntry = { section: Section; visible: boolean }

export type Member = Row & {
  household_id: string
  user_id: string
  label: string | null
  home_layout: LayoutEntry[]
  joined_at: string
}

export type List = Row & { household_id: string; name: string; position: number; created_at: string }

export type Item = Row & {
  list_id: string
  name: string
  note: string | null
  added_by: string | null
  created_at: string
  checked_by: string | null
  checked_at: string | null
  position: number
  /** The pantry thing this is for. Buying it fills it up again. */
  pantry_item_id?: string | null
  /** Pichi put it on the list because it was running low. */
  added_by_pichi?: boolean
}

export type Place = 'pantry' | 'bathroom'
export type Container = 'jar' | 'bottle' | 'box' | 'bag' | 'can' | 'carton' | 'tube' | 'pump' | 'spray' | 'dropper' | 'jug' | 'creamjar' | 'lotion' | 'perfume' | 'mist' | 'flatbox'

export type RoomKind = 'kitchen' | 'bathroom' | 'other'
/** A room in the home (Kitchen, Bathroom, Hallway...). kind decides which drawings it offers. */
export type Room = Row & { household_id: string; name: string; kind: RoomKind; position: number; created_at: string }
/** A storage spot inside a room: Pantry, Bathroom cabinet, Bathtub shelf, a second cabinet. */
export type Spot = Row & { household_id: string; room_id: string; name: string; position: number; created_at: string }

export type PantryItem = Row & {
  household_id: string
  /** The storage spot it lives in. */
  spot_id: string | null
  /** From before rooms; the database keeps it in step with the spot's room. */
  place: Place
  name: string
  container: Container
  level: number
  low_at: number
  list_id: string | null
  position: number
  created_by: string | null
  created_at: string
  updated_by: string | null
  updated_at: string
}

export type Todo = Row & {
  household_id: string
  title: string
  assignee_id: string | null
  due_date: string | null
  repeat: 'daily' | 'weekly' | 'monthly' | null
  done_at: string | null
  done_by: string | null
  created_by: string | null
  created_at: string
}

export type Note = Row & {
  household_id: string
  title: string
  body: string
  pinned: boolean
  created_by: string | null
  updated_by: string | null
  updated_at: string
}

export type Comment = Row & {
  household_id: string
  item_id: string | null
  todo_id: string | null
  note_id: string | null
  author_id: string | null
  body: string
  created_at: string
}

export type Message = Row & {
  household_id: string
  author_id: string | null
  to_user: string | null
  body: string
  created_at: string
}

export type ChatRead = Row & { user_id: string; household_id: string; chat: string; read_at: string }

// ---------------------------------------------------------------------------

export function useProfiles() {
  return useCollection<Profile>({
    key: 'profiles',
    table: 'profiles',
    belongs: () => true,
    load: () => supabase.from('profiles').select('*'),
  })
}

export function useMyProfile(): Profile | undefined {
  const me = useMe()
  return useProfiles().rows.find((p) => p.id === me)
}

export function useHouseholds() {
  return useCollection<Household>({
    key: 'households',
    table: 'households',
    belongs: () => true,
    load: () => supabase.from('households').select('*').order('created_at'),
  })
}

export function useMembers() {
  return useCollection<Member>({
    key: 'members',
    table: 'household_members',
    belongs: () => true,
    load: () => supabase.from('household_members').select('*').order('joined_at'),
  })
}

export function useLists(householdId: string | null) {
  return useCollection<List>(
    householdId
      ? {
          key: `lists:${householdId}`,
          table: 'lists',
          belongs: (r) => r.household_id === householdId,
          load: () => supabase.from('lists').select('*').eq('household_id', householdId).order('position').order('created_at'),
          realtime: `household_id=eq.${householdId}`,
        }
      : null,
  )
}

export function useItems(listId: string | null) {
  return useCollection<Item>(
    listId
      ? {
          key: `items:${listId}`,
          table: 'list_items',
          belongs: (r) => r.list_id === listId,
          load: () => supabase.from('list_items').select('*').eq('list_id', listId),
          realtime: `list_id=eq.${listId}`,
        }
      : null,
  )
}

/** Items from several lists at once (Home's "to buy" shows every list in the household). */
export function useItemsIn(listIds: string[]) {
  const ids = [...listIds].sort()
  const key = ids.join(',')
  return useCollection<Item>(
    ids.length
      ? {
          key: `items-in:${key}`,
          table: 'list_items',
          belongs: (r) => ids.includes(r.list_id as string),
          load: () => supabase.from('list_items').select('*').in('list_id', ids),
          realtime: `list_id=in.(${key})`,
        }
      : null,
  )
}

/** What's on the shelves: the pantry and the bathroom cabinet. */
export function usePantry(householdId: string | null) {
  return useCollection<PantryItem>(
    householdId
      ? {
          key: `pantry:${householdId}`,
          table: 'pantry_items',
          belongs: (r) => r.household_id === householdId,
          load: () => supabase.from('pantry_items').select('*').eq('household_id', householdId),
          realtime: `household_id=eq.${householdId}`,
        }
      : null,
  )
}

const byPosition = <T extends { position: number; created_at: string }>(a: T, b: T) => a.position - b.position || a.created_at.localeCompare(b.created_at)

/** The household's rooms, in order. */
export function useRooms(householdId: string | null) {
  const c = useCollection<Room>(
    householdId
      ? {
          key: `rooms:${householdId}`,
          table: 'rooms',
          belongs: (r) => r.household_id === householdId,
          load: () => supabase.from('rooms').select('*').eq('household_id', householdId),
          realtime: `household_id=eq.${householdId}`,
        }
      : null,
  )
  return { ...c, rows: useMemo(() => [...c.rows].sort(byPosition), [c.rows]) }
}

/** The storage spots in all rooms, in order. */
export function useSpots(householdId: string | null) {
  const c = useCollection<Spot>(
    householdId
      ? {
          key: `spots:${householdId}`,
          table: 'storage_spots',
          belongs: (r) => r.household_id === householdId,
          load: () => supabase.from('storage_spots').select('*').eq('household_id', householdId),
          realtime: `household_id=eq.${householdId}`,
        }
      : null,
  )
  return { ...c, rows: useMemo(() => [...c.rows].sort(byPosition), [c.rows]) }
}

export function useTodos(householdId: string | null) {
  return useCollection<Todo>(
    householdId
      ? {
          key: `todos:${householdId}`,
          table: 'todos',
          belongs: (r) => r.household_id === householdId,
          load: () => supabase.from('todos').select('*').eq('household_id', householdId),
          realtime: `household_id=eq.${householdId}`,
        }
      : null,
  )
}

export function useNotes(householdId: string | null) {
  return useCollection<Note>(
    householdId
      ? {
          key: `notes:${householdId}`,
          table: 'notes',
          belongs: (r) => r.household_id === householdId,
          load: () => supabase.from('notes').select('*').eq('household_id', householdId),
          realtime: `household_id=eq.${householdId}`,
        }
      : null,
  )
}

/** Every comment in the household (they're short and few), for threads and the little counts. */
export function useComments(householdId: string | null) {
  return useCollection<Comment>(
    householdId
      ? {
          key: `comments:${householdId}`,
          table: 'comments',
          belongs: (r) => r.household_id === householdId,
          load: () => supabase.from('comments').select('*').eq('household_id', householdId).order('created_at'),
          realtime: `household_id=eq.${householdId}`,
        }
      : null,
  )
}

/** Every message I can see in the household: the group chat and my private chats. */
export function useMessages(householdId: string | null) {
  return useCollection<Message>(
    householdId
      ? {
          key: `messages:${householdId}`,
          table: 'messages',
          belongs: (r) => r.household_id === householdId,
          load: () => supabase.from('messages').select('*').eq('household_id', householdId).order('created_at'),
          realtime: `household_id=eq.${householdId}`,
        }
      : null,
  )
}

/** Where everyone in the household stopped reading each chat (mine for unread counts, theirs for read ticks). */
export function useChatReads(householdId: string | null) {
  return useCollection<ChatRead>(
    householdId
      ? {
          key: `chat_reads:${householdId}`,
          table: 'chat_reads',
          belongs: (r) => r.household_id === householdId,
          load: () => supabase.from('chat_reads').select('*').eq('household_id', householdId),
          realtime: `household_id=eq.${householdId}`,
        }
      : null,
  )
}

// ---------------------------------------------------------------------------
// The household you're looking at. Saved on the phone.
// ---------------------------------------------------------------------------

const CURRENT_KEY = 'pichigoose.household'
const currentListeners = new Set<() => void>()

function readCurrent() {
  try {
    return localStorage.getItem(CURRENT_KEY)
  } catch {
    return null
  }
}

export function setCurrentHousehold(id: string) {
  try {
    localStorage.setItem(CURRENT_KEY, id)
  } catch {
    // ignore
  }
  currentListeners.forEach((l) => l())
}

/** The current household, the people in it and your own member row. */
export function useHousehold() {
  const me = useMe()
  const saved = useSyncExternalStore(
    (l) => {
      currentListeners.add(l)
      return () => currentListeners.delete(l)
    },
    readCurrent,
  )
  const households = useHouseholds()
  const members = useMembers()
  const profiles = useProfiles()

  return useMemo(() => {
    const mine = members.rows.filter((m) => m.user_id === me)
    const homes = households.rows.filter((h) => mine.some((m) => m.household_id === h.id))
    const household = homes.find((h) => h.id === saved) ?? homes[0] ?? null
    const membership = household ? mine.find((m) => m.household_id === household.id) ?? null : null
    const people = household
      ? members.rows
          .filter((m) => m.household_id === household.id)
          .map((m) => profiles.rows.find((p) => p.id === m.user_id))
          .filter((p): p is Profile => Boolean(p))
      : []
    return {
      loaded: households.loaded && members.loaded,
      households: homes,
      household,
      membership,
      people,
      /** What you call this household. */
      name: (h: Household | null) => {
        if (!h) return ''
        const m = mine.find((x) => x.household_id === h.id)
        return m?.label || h.name
      },
      peopleIn: (householdId: string) =>
        members.rows
          .filter((m) => m.household_id === householdId)
          .map((m) => profiles.rows.find((p) => p.id === m.user_id))
          .filter((p): p is Profile => Boolean(p)),
    }
  }, [me, saved, households.rows, households.loaded, members.rows, members.loaded, profiles.rows])
}

/** Someone's own home order, with any section that's new since they arranged it (like the pantry)
 *  slotted in where it sits by default, right after the section it follows. */
export function completeLayout(saved: LayoutEntry[] | undefined | null, rooms?: Room[]): LayoutEntry[] {
  let out = saved?.length ? [...saved] : [...DEFAULT_LAYOUT]
  DEFAULT_LAYOUT.forEach((d, i) => {
    if (out.some((s) => s.section === d.section)) return
    if ((d.section === 'pantry' || d.section === 'bathroom') && out.some((s) => s.section.startsWith('room:'))) return
    const before = i > 0 ? out.findIndex((s) => s.section === DEFAULT_LAYOUT[i - 1].section) : -1
    out.splice(before + 1, 0, d)
  })
  if (!rooms?.length) return out
  // Rooms: the old kitchen and bathroom notes become those rooms' notes; rooms that are gone drop
  // out; new rooms go after the last room (or after shopping).
  const firstOf = (kind: Room['kind']) => rooms.find((r) => r.kind === kind)
  out = out.flatMap((e) => {
    if (e.section === 'pantry' || e.section === 'bathroom') {
      const r = firstOf(e.section === 'pantry' ? 'kitchen' : 'bathroom')
      return r ? [{ ...e, section: `room:${r.id}` as Section }] : []
    }
    if (e.section.startsWith('room:') && !rooms.some((r) => `room:${r.id}` === e.section)) return []
    return [e]
  })
  out = out.filter((e, i) => out.findIndex((x) => x.section === e.section) === i)
  for (const r of rooms) {
    const key = `room:${r.id}` as Section
    if (out.some((e) => e.section === key)) continue
    let at = -1
    out.forEach((e, i) => {
      if (e.section.startsWith('room:') || e.section === 'shopping') at = i
    })
    out.splice(at + 1, 0, { section: key, visible: true })
  }
  return out
}

export const DEFAULT_LAYOUT: LayoutEntry[] = [
  { section: 'news', visible: true },
  { section: 'shopping', visible: true },
  { section: 'pantry', visible: true },
  { section: 'bathroom', visible: true },
  { section: 'todos', visible: true },
  { section: 'money', visible: true },
  { section: 'notes', visible: true },
]
