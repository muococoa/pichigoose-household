import { useMemo, useRef, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMe } from '../auth'
import { db } from '../data/store'
import { useHousehold, useItems, useLists, type Item, type List } from '../data/hooks'
import { recentlyBought, toggleItem } from '../data/actions'
import { Screen } from '../components/Shell'
import { Avatar } from '../components/Avatar'
import { Check, Hand, PichiStamp, Sheet, Stamp, STAMP_COLORS, showToast, tilt, type TapeKind } from '../components/Scrapbook'
import { BackIcon, PlusIcon, ShareIcon } from '../components/Icons'
import { ago } from '../lib/time'

const TAB_TAPES: TapeKind[] = ['tp', 'tm', 'ty', 'tb', 'tdots', 'tblocks', 'ttri', 'tcheck']
const LIST_KEY = 'pichigoose.list'

function savedList(householdId: string) {
  try {
    return localStorage.getItem(`${LIST_KEY}.${householdId}`)
  } catch {
    return null
  }
}

function saveList(householdId: string, listId: string) {
  try {
    localStorage.setItem(`${LIST_KEY}.${householdId}`, listId)
  } catch {
    // ignore
  }
}

export function ShoppingScreen() {
  const { t, i18n } = useTranslation()
  const me = useMe()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { household, people } = useHousehold()
  const hid = household?.id ?? null
  const lists = useLists(hid)
  const sortedLists = useMemo(
    () => [...lists.rows].sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at)),
    [lists.rows],
  )
  const [picked, setPicked] = useState<string | null>(() => (hid ? savedList(hid) : null))
  const list = sortedLists.find((l) => l.id === picked) ?? sortedLists[0] ?? null
  const items = useItems(list?.id ?? null)
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const [newList, setNewList] = useState<string | null>(null)
  const [editingList, setEditingList] = useState<List | null>(null)
  const [listName, setListName] = useState('')
  const [editing, setEditing] = useState<Item | null>(null)
  const [itemName, setItemName] = useState('')
  const [itemNote, setItemNote] = useState('')

  // The add field opens only when someone taps +.
  const [adding, setAdding] = useState(() => Boolean(params.get('add')))

  const toBuy = useMemo(() => items.rows.filter((x) => !x.checked_at).sort((a, b) => b.created_at.localeCompare(a.created_at)), [items.rows])
  const bought = useMemo(
    () => items.rows.filter((x) => recentlyBought(x)).sort((a, b) => (b.checked_at ?? '').localeCompare(a.checked_at ?? '')),
    [items.rows],
  )

  const person = (id: string | null) => people.find((p) => p.id === id)

  function pick(l: List) {
    if (list?.id === l.id) {
      setListName(l.name)
      setEditingList(l)
      return
    }
    setPicked(l.id)
    if (hid) saveList(hid, l.id)
  }

  function add(e: FormEvent) {
    e.preventDefault()
    const name = text.trim()
    if (!name || !list) return
    db.insert('list_items', {
      list_id: list.id,
      name,
      note: null,
      added_by: me,
      created_at: new Date().toISOString(),
      checked_at: null,
      checked_by: null,
      position: 0,
    })
    setText('')
    inputRef.current?.focus()
  }

  function addList(e: FormEvent) {
    e.preventDefault()
    const name = (newList ?? '').trim()
    if (!name || !hid) return
    const row = db.insert('lists', {
      household_id: hid,
      name,
      position: sortedLists.length,
      created_by: me,
      created_at: new Date().toISOString(),
    })
    setPicked(row.id)
    saveList(hid, row.id)
    setNewList(null)
  }

  async function share() {
    if (!list) return
    const body = [`${list.name}:`, ...toBuy.map((x) => `- ${x.name}${x.note ? ` (${x.note})` : ''}`)].join('\n')
    if (navigator.share) {
      try {
        await navigator.share({ title: list.name, text: body })
      } catch {
        // Closed the share sheet.
      }
      return
    }
    try {
      await navigator.clipboard.writeText(body)
      showToast(t('common.copied'))
    } catch {
      window.prompt('', body)
    }
  }

  function row(x: Item, isBought: boolean) {
    const who = person(x.added_by)
    return (
      <div key={x.id} className="ln" style={isBought ? { height: 48, color: '#857A8C' } : { height: 64 }}>
        <Check checked={isBought} onChange={() => toggleItem(x, me)} label={x.name} rotate={tilt(x.id)} />
        <button
          type="button"
          style={{ flex: 1, minWidth: 0, fontSize: 17 }}
          onClick={() => {
            setItemName(x.name)
            setItemNote(x.note ?? '')
            setEditing(x)
          }}
        >
          <span style={isBought ? { textDecoration: 'line-through', textDecorationColor: '#D34471', textDecorationThickness: 2 } : undefined}>{x.name}</span>
          {!isBought && (
            <div className="cap">
              {x.note ? `${x.note} · ` : ''}
              {t('shopping.addedBy', { name: who?.display_name ?? t('common.someone'), when: ago(x.created_at, i18n.language) })}
            </div>
          )}
        </button>
        {who &&
          (isBought ? (
            <span style={{ opacity: 0.6, display: 'flex' }}>
              <Avatar avatar={who.avatar} label={who.display_name} />
            </span>
          ) : (
            <Avatar avatar={who.avatar} label={who.display_name} />
          ))}
      </div>
    )
  }

  return (
    <Screen tabbar>
      {adding ? (
        <form
          onSubmit={add}
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 'var(--tabbar)',
            maxWidth: 430,
            margin: '0 auto',
            zIndex: 6,
            background: '#FFFDF8',
            boxShadow: '0 -6px 14px rgba(30,26,48,.08)',
            padding: '14px 20px 14px 20px',
            display: 'flex',
            gap: 12,
            alignItems: 'flex-start',
          }}
        >
          <input
            ref={inputRef}
            className="input"
            style={{ flex: 1 }}
            autoFocus
            placeholder={t('shopping.addItem')}
            aria-label={t('shopping.addItem')}
            value={text}
            enterKeyHint="done"
            onChange={(e) => setText(e.target.value)}
            onBlur={() => {
              // Close the field again when it's left empty.
              if (!text.trim()) setAdding(false)
            }}
          />
          <button
            type="submit"
            className="stk prim round"
            aria-label={t('shopping.addButton')}
            onPointerDown={(e) => e.preventDefault()}
            style={{ width: 54, height: 54, transform: 'rotate(-4deg)', marginTop: -1 }}
          >
            <PlusIcon />
          </button>
        </form>
      ) : (
        <button
          type="button"
          className="stk prim round"
          aria-label={t('shopping.addButton')}
          onClick={() => setAdding(true)}
          style={{ position: 'fixed', right: 'max(20px, calc(50vw - 195px))', bottom: 'calc(var(--tabbar) + 20px)', zIndex: 6, transform: 'rotate(-4deg)' }}
        >
          <PlusIcon />
        </button>
      )}
      <div style={{ padding: 'calc(var(--top) + 8px) 22px 0 40px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: -10 }}>
          <button type="button" aria-label={t('common.back')} onClick={() => navigate('/')} style={{ color: '#1E1A30', display: 'flex' }}>
            <BackIcon />
          </button>
          <Hand as="h1" size={42} lineHeight={44} style={{ margin: 0 }}>
            {t('shopping.title')}
          </Hand>
          <span style={{ flex: 1 }} />
          <button type="button" className="stk sec sm" aria-label={t('shopping.share')} style={{ width: 38, padding: 0, transform: 'rotate(2deg)' }} onClick={share}>
            <ShareIcon />
          </button>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', rowGap: 12 }}>
          {sortedLists.map((l, i) => {
            const on = l.id === list?.id
            return (
              <button
                key={l.id}
                type="button"
                className={TAB_TAPES[i % TAB_TAPES.length]}
                aria-pressed={on}
                onClick={() => pick(l)}
                style={{
                  position: 'relative',
                  display: 'inline-flex',
                  alignItems: 'center',
                  height: 30,
                  padding: '0 14px',
                  fontSize: 14,
                  color: on ? '#1E1A30' : '#63586B',
                  fontWeight: on ? 800 : 700,
                  transform: `rotate(${i % 2 ? 1.5 : -2}deg)`,
                  boxShadow: on ? '1px 2px 0 rgba(30,26,48,.12)' : undefined,
                  opacity: on ? 1 : 0.75,
                }}
              >
                {l.name}
              </button>
            )
          })}
          <button
            type="button"
            onClick={() => setNewList('')}
            style={{ display: 'inline-flex', alignItems: 'center', height: 28, padding: '0 12px', fontSize: 14, fontWeight: 700, color: '#63586B', border: '2px dashed #B6ABBE', borderRadius: 4 }}
          >
            {t('shopping.addList')}
          </button>
        </div>
      </div>

      <div style={{ padding: `26px 22px ${adding ? 110 : 24}px 40px` }}>
        {toBuy.map((x) => row(x, false))}
        {items.loaded && !toBuy.length && (
          <div className="row" style={{ gap: 14, padding: '10px 0 6px' }}>
            <PichiStamp width={46} height={56} rotate={-4} />
            <p className="body" style={{ margin: 0 }}>
              {t('shopping.empty')}
            </p>
          </div>
        )}
        {bought.length > 0 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '22px 0 4px' }}>
              <Stamp color={STAMP_COLORS.locked}>{t('shopping.bought')}</Stamp>
              <span className="cap">{t('common.items', { count: bought.length })}</span>
            </div>
            {bought.map((x) => row(x, true))}
          </>
        )}
      </div>

      <Sheet open={newList !== null} onClose={() => setNewList(null)} title={t('shopping.newList')}>
        <form onSubmit={addList} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <input className="input" autoFocus placeholder={t('shopping.newListPlaceholder')} aria-label={t('shopping.newList')} value={newList ?? ''} onChange={(e) => setNewList(e.target.value)} />
          <button type="submit" className="stk prim" style={{ width: '100%' }}>
            {t('shopping.addListButton')}
          </button>
        </form>
      </Sheet>

      <Sheet open={Boolean(editingList)} onClose={() => setEditingList(null)} title={t('shopping.renameList')}>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (editingList && listName.trim()) db.update('lists', editingList.id, { name: listName.trim() })
            setEditingList(null)
          }}
          style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
        >
          <input className="input" value={listName} aria-label={t('shopping.renameList')} onChange={(e) => setListName(e.target.value)} />
          <button type="submit" className="stk prim" style={{ width: '100%' }}>
            {t('common.save')}
          </button>
          {sortedLists.length > 1 && (
            <button
              type="button"
              className="stk sec"
              style={{ width: '100%', color: '#A8335A' }}
              onClick={() => {
                if (editingList && window.confirm(t('shopping.deleteListText', { name: editingList.name }))) {
                  db.remove('lists', editingList.id)
                  setPicked(null)
                }
                setEditingList(null)
              }}
            >
              {t('shopping.deleteList')}
            </button>
          )}
        </form>
      </Sheet>

      <Sheet open={Boolean(editing)} onClose={() => setEditing(null)} title={t('shopping.editItem')}>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (editing && itemName.trim()) db.update('list_items', editing.id, { name: itemName.trim(), note: itemNote.trim() || null })
            setEditing(null)
          }}
          style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
        >
          <div>
            <label className="label" htmlFor="item-name">
              {t('shopping.itemName')}
            </label>
            <input id="item-name" className="input" value={itemName} onChange={(e) => setItemName(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="item-note">
              {t('shopping.itemNote')}
            </label>
            <input id="item-note" className="input" placeholder={t('shopping.itemNotePlaceholder')} value={itemNote} onChange={(e) => setItemNote(e.target.value)} />
          </div>
          <div className="row" style={{ gap: 12, marginTop: 6 }}>
            <button
              type="button"
              className="stk sec"
              style={{ flex: 1, color: '#A8335A' }}
              onClick={() => {
                if (editing) db.remove('list_items', editing.id)
                setEditing(null)
              }}
            >
              {t('common.delete')}
            </button>
            <button type="submit" className="stk prim" style={{ flex: 1.4 }}>
              {t('common.save')}
            </button>
          </div>
        </form>
      </Sheet>
    </Screen>
  )
}
