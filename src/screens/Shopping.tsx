import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMe } from '../auth'
import { db } from '../data/store'
import { useHousehold, useItems, useLists, type Item, type List } from '../data/hooks'
import { recentlyBought, toggleItem } from '../data/actions'
import { Floating, Screen } from '../components/Shell'
import { Avatar } from '../components/Avatar'
import { Check, Hand, Struck, Tick, useArrivals, EmptyState, Sheet, Stamp, STAMP_COLORS, showToast, tilt, type TapeKind } from '../components/Scrapbook'
import { BackIcon, PlusIcon, ShareIcon } from '../components/Icons'
import { ago } from '../lib/time'
import { useDesktop } from '../lib/desktop'
import { CommentCount, Comments, useCommentCounts } from '../components/Comments'

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
  const desktop = useDesktop()
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

  // The add field opens only when someone taps +.
  const [adding, setAdding] = useState(() => Boolean(params.get('add')))
  // Lets the Not synced stamp step above the open add bar.
  useEffect(() => {
    document.body.classList.toggle('adding', adding)
    return () => document.body.classList.remove('adding')
  }, [adding])

  const toBuy = useMemo(() => items.rows.filter((x) => !x.checked_at).sort((a, b) => b.created_at.localeCompare(a.created_at)), [items.rows])
  const bought = useMemo(
    () => items.rows.filter((x) => recentlyBought(x)).sort((a, b) => (b.checked_at ?? '').localeCompare(a.checked_at ?? '')),
    [items.rows],
  )

  const { arrived } = useArrivals(bought.length ? ['bought'] : [])

  const person = (id: string | null) => people.find((p) => p.id === id)
  const commentsOn = useCommentCounts()

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
    const body = [`${list.name}:`, ...toBuy.map((x) => `- ${x.name}`)].join('\n')
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
      <Tick key={x.id} checked={isBought} onCommit={() => toggleItem(x, me)}>
        {(on, toggle) => (
      <div
        className={`ln${on ? ' row-done' : ''}${isBought ? '' : ' top'}`}
        style={isBought ? { height: desktop ? 72 : 48 } : { minHeight: desktop ? 72 : 64, padding: desktop ? '14px 0' : '10px 0' }}
      >
        <Check checked={on} onToggle={toggle} label={x.name} rotate={tilt(x.id)} />
        <button
          type="button"
          style={{ flex: 1, minWidth: 0, fontSize: desktop ? 18 : 17 }}
          onClick={() => {
            setItemName(x.name)
            setEditing(x)
          }}
        >
          <Struck on={on}>{x.name}</Struck>
          <CommentCount n={commentsOn(x.id)} />
          {!isBought && (
            <div className="cap" style={desktop ? { fontSize: 13 } : undefined}>
              {t('shopping.addedBy', { name: who?.display_name ?? t('common.someone'), when: ago(x.created_at, i18n.language) })}
            </div>
          )}
        </button>
        {who && (
          <span className={`av-fade${on ? ' done' : ''}`}>
            <Avatar avatar={who.avatar} label={who.display_name} />
          </span>
        )}
      </div>
        )}
      </Tick>
    )
  }

  return (
    <Screen tabbar wide className="has-fab">
      {/* One + sticker that turns into the add bar. Closed, it floats above the tab bar.
          Tapped, it settles into the bar while the field grows out of it. Phone only. */}
      {!desktop && (
      <Floating>
      <form onSubmit={add} className={`add-bar${adding ? ' open' : ''}`}>
        <input
          ref={inputRef}
          className="input"
          tabIndex={adding ? 0 : -1}
          aria-hidden={!adding}
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
          onClick={(e) => {
            if (adding) return
            e.preventDefault()
            setAdding(true)
            // Focus right away, inside the tap, so the phone opens the keyboard.
            inputRef.current?.focus()
          }}
        >
          <PlusIcon />
        </button>
      </form>
      </Floating>
      )}
      <div style={{ padding: 'calc(var(--top) + 8px) 22px 0 40px', display: 'flex', flexDirection: 'column', gap: desktop ? 18 : 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: desktop ? 0 : -10 }}>
          {!desktop && (
            <button type="button" aria-label={t('common.back')} onClick={() => navigate('/')} style={{ color: '#1E1A30', display: 'flex' }}>
              <BackIcon />
            </button>
          )}
          <Hand as="h1" size={desktop ? 52 : 42} lineHeight={desktop ? 56 : 44} style={{ margin: 0 }}>
            {t('shopping.title')}
          </Hand>
          <span style={{ flex: 1 }} />
          <button type="button" className="stk sec sm" aria-label={t('shopping.share')} style={{ width: desktop ? 42 : 38, padding: 0, transform: `rotate(${desktop ? 3 : 2}deg)` }} onClick={share}>
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

      {desktop ? (
        // Desktop (D5): the add field on top of the list (Enter adds and keeps it ready for the next one),
        // and Bought in its own column on the right.
        <div style={{ display: 'flex', flexWrap: 'wrap', columnGap: 64, rowGap: 28, alignItems: 'flex-start', padding: '26px 22px 32px 40px' }}>
          <div style={{ flex: '1.5 1 380px', minWidth: 0 }}>
            <form onSubmit={add} style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 8 }}>
              <input
                ref={inputRef}
                className="input"
                autoFocus={Boolean(params.get('add'))}
                placeholder={t('shopping.addItem')}
                aria-label={t('shopping.addItem')}
                value={text}
                onChange={(e) => setText(e.target.value)}
                style={{ flex: 1, fontSize: 17 }}
              />
              <button type="submit" className="stk prim" style={{ transform: 'rotate(-1.5deg)' }}>
                {t('shopping.addButton')}
              </button>
            </form>
            {toBuy.map((x) => row(x, false))}
            {items.loaded && !toBuy.length && (
              <EmptyState pose="stand-left" color="#F8E6A8" zoom={0.95}>
                {t('shopping.emptyAbove')}
              </EmptyState>
            )}
          </div>
          <div style={{ flex: '1 1 260px', minWidth: 0, paddingTop: 10 }}>
            {bought.length > 0 && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <Stamp color={STAMP_COLORS.locked} motion={arrived.length ? 'in' : undefined}>{t('shopping.bought')}</Stamp>
                  <span className="cap">{t('common.items', { count: bought.length })}</span>
                </div>
                {bought.map((x) => row(x, true))}
              </>
            )}
          </div>
        </div>
      ) : (
      <div style={{ padding: '26px 22px 0 40px' }}>
        {toBuy.map((x) => row(x, false))}
        {items.loaded && !toBuy.length && (
          <EmptyState pose="stand-left" color="#F8E6A8" zoom={0.95}>
            {t('shopping.empty')}
          </EmptyState>
        )}
        {bought.length > 0 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '22px 0 4px' }}>
              <Stamp color={STAMP_COLORS.locked} motion={arrived.length ? 'in' : undefined}>{t('shopping.bought')}</Stamp>
              <span className="cap">{t('common.items', { count: bought.length })}</span>
            </div>
            {bought.map((x) => row(x, true))}
          </>
        )}
      </div>
      )}

      <Sheet small open={newList !== null} onClose={() => setNewList(null)} title={t('shopping.newList')}>
        <form onSubmit={addList} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <input className="input" autoFocus placeholder={t('shopping.newListPlaceholder')} aria-label={t('shopping.newList')} value={newList ?? ''} onChange={(e) => setNewList(e.target.value)} />
          <button type="submit" className="stk prim" style={{ width: '100%' }}>
            {t('shopping.addListButton')}
          </button>
        </form>
      </Sheet>

      <Sheet small open={Boolean(editingList)} onClose={() => setEditingList(null)} title={t('shopping.renameList')}>
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
          id="item-form"
          onSubmit={(e) => {
            e.preventDefault()
            if (editing && itemName.trim()) db.update('list_items', editing.id, { name: itemName.trim() })
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
        </form>
        {editing && (
          <div style={{ marginTop: 18 }}>
            <Comments target={{ item_id: editing.id }} />
          </div>
        )}
        <div className="row sheet-actions" style={{ gap: 12, marginTop: 18 }}>
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
            <button type="submit" form="item-form" className="stk prim" style={{ flex: 1.4 }}>
              {t('common.save')}
            </button>
        </div>
      </Sheet>
    </Screen>
  )
}
