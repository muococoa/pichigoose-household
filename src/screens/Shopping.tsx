import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMe } from '../auth'
import { db } from '../data/store'
import { useHousehold, useItems, useLists, useProjects, usePantry, type Item, type List } from '../data/hooks'
import { recentlyBought, toggleItem } from '../data/actions'
import { ArchiveLink } from '../components/Archive'
import { Floating, Screen } from '../components/Shell'
import { Avatar } from '../components/Avatar'
import { Check, DeleteLink, Hand, PichiAvatar, PoseStamp, Struck, Tick, useArrivals, EmptyState, Sheet, Stamp, STAMP_COLORS, showToast, showUndo, tilt, type TapeKind } from '../components/Scrapbook'
import { BackIcon, PlusIcon, ShareIcon, TrashIcon } from '../components/Icons'
import { ago } from '../lib/time'
import { DndContext, MouseSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useDesktop } from '../lib/desktop'
import { useKept } from '../lib/kept'
import { TypingBar, justSent } from '../components/TypingBar'
import { Chip } from './Todos'
import { useSlideDirection, useSwipeBetween, useTapeBounce } from '../components/Slide'
import { PersonLink } from './Person'
import { CommentCount, Comments, useCommentCounts } from '../components/Comments'
import { groupKey, groupLow } from '../components/Shelves'
import { useBack } from '../lib/back'
import { SwipeRow } from '../components/SwipeRow'
import { autoFocusField, focusField } from '../lib/keyboard'

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
  const back = useBack()
  const desktop = useDesktop()
  const [params] = useSearchParams()
  const { household, people } = useHousehold()
  const hid = household?.id ?? null
  const lists = useLists(hid)
  // A finished project's list leaves Shopping (it stays in the project).
  const projects = useProjects(hid)
  const sortedLists = useMemo(
    () =>
      lists.rows
        .filter((l) => !l.project_id || projects.rows.some((p) => p.id === l.project_id && !p.done_at))
        .sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at)),
    [lists.rows, projects.rows],
  )
  const [picked, setPicked] = useState<string | null>(() => (hid ? savedList(hid) : null))
  const list = sortedLists.find((l) => l.id === picked) ?? sortedLists[0] ?? null
  const items = useItems(list?.id ?? null)
  // What you were typing, and any pop-up you had open, stay as they were if you step away and come back.
  const keep = `shopping:${hid}`
  const [text, setText] = useKept(`${keep}:text`, '')
  const inputRef = useRef<HTMLInputElement>(null)
  const [newList, setNewList] = useKept<string | null>(`${keep}:newList`, null)
  // The item a new list is being made for, from its pop-up.
  const [movingItem, setMovingItem] = useState<Item | null>(null)
  const [editingList, setEditingList] = useKept<List | null>(`${keep}:editingList`, null)
  const [listName, setListName] = useKept(`${keep}:listName`, '')
  const [editing, setEditing] = useKept<Item | null>(`${keep}:editing`, null)
  const [itemName, setItemName] = useKept(`${keep}:itemName`, '')

  // The add field opens only when someone taps + (or it was open when you stepped away).
  const [adding, setAdding] = useKept(`${keep}:adding`, Boolean(params.get('add')))
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
  // For the things Pichi put on the list: how much is left of them.
  const pantry = usePantry(hid)
  // Deleting something the pantry still needs: Pichi asks first.
  const [checking, setChecking] = useState<Item | null>(null)
  function stillNeeded(x: Item) {
    const thing = pantry.rows.find((p) => p.id === x.pantry_item_id)
    if (!thing) return false
    return groupLow(pantry.rows.filter((p) => groupKey(p) === groupKey(thing)))
  }
  const commentsOn = useCommentCounts()

  // Swipe the page left or right for the next or previous list (phone).
  const tabsRow = useRef<HTMLDivElement>(null)
  const listIndex = list ? sortedLists.indexOf(list) : -1
  const slide = useSlideDirection(listIndex)
  useTapeBounce(tabsRow, list?.id ?? null)
  const goTo = (i: number) => {
    const l = sortedLists[i]
    if (!l) return
    setPicked(l.id)
    if (hid) saveList(hid, l.id)
  }
  useSwipeBetween(desktop || listIndex <= 0 ? null : () => goTo(listIndex - 1), desktop || listIndex < 0 || listIndex >= sortedLists.length - 1 ? null : () => goTo(listIndex + 1))

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
    if (!text.trim()) return
    addItem(text.trim())
    focusField(inputRef.current)
  }

  function addItem(name: string) {
    if (!list) return
    db.insert('list_items', {
      list_id: list.id,
      name,
        added_by: me,
      created_at: new Date().toISOString(),
      checked_at: null,
      checked_by: null,
      position: 0,
    })
    setText('')
  }

  // Categories inside a list (Nora, 29 Oct): once any item has one, items sit under small headings, A to Z, with the
  // ones without a category under "other" at the end.
  const categories = useMemo(() => [...new Set(items.rows.map((x) => x.category?.trim()).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b)), [items.rows])
  function grouped(rows: Item[]) {
    if (!categories.length) return rows.map((x) => row(x, false))
    const groups = [...categories.map((c) => ({ name: c, rows: rows.filter((x) => x.category?.trim() === c) })), { name: t('shopping.otherCategory'), rows: rows.filter((x) => !x.category?.trim()) }]
    return groups
      .filter((g) => g.rows.length)
      .map((g) => (
        <section key={g.name} style={{ marginTop: 6 }}>
          <Hand size={24} lineHeight={28} color="var(--hero-dark)" style={{ marginTop: 6 }}>
            {g.name.toLocaleLowerCase()}
          </Hand>
          {g.rows.map((x) => row(x, false))}
        </section>
      ))
  }
  const [newCategory, setNewCategory] = useState<string | null>(null)
  function setCategory(item: Item, category: string | null) {
    db.update('list_items', item.id, { category })
    if (editing?.id === item.id) setEditing({ ...editing, category })
  }

  // The item pop-up: its name saves a moment after the last key, and when it closes.
  function saveItemName() {
    if (editing && itemName.trim() && itemName.trim() !== editing.name) db.update('list_items', editing.id, { name: itemName.trim() })
  }
  useEffect(() => {
    if (!editing) return
    const timer = window.setTimeout(saveItemName, 500)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemName])
  function closeItem() {
    saveItemName()
    setEditing(null)
  }
  function removeItem() {
    if (!editing) return
    // Still almost out in the pantry? Pichi checks first.
    if (stillNeeded(editing)) {
      setChecking(editing)
      setEditing(null)
      return
    }
    const undo = db.removeWithUndo('list_items', editing.id)
    setEditing(null)
    showUndo(t('shopping.itemDeleted'), t('common.undo'), undo)
  }

  // Lists keep the order people give them (shared by the household). Groceries always stays first.
  function reorderLists(ids: string[]) {
    ids.forEach((id, position) => {
      const l = sortedLists.find((x) => x.id === id)
      if (l && l.position !== position) db.update('lists', id, { position })
    })
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
    // Started from an item's pop-up: that item moves to the new list.
    if (movingItem) moveItem(movingItem, row.id as string)
    setMovingItem(null)
    setPicked(row.id)
    saveList(hid, row.id)
    setNewList(null)
  }

  // Move an item to another list (from its pop-up), and follow it there.
  function moveItem(item: Item, listId: string) {
    if (item.list_id === listId) return
    db.update('list_items', item.id, { list_id: listId })
    if (editing?.id === item.id) setEditing({ ...editing, list_id: listId })
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

  // "Pichi peeked: only 10% left", with how full it is right now.
  function pichiLine(x: Item) {
    const when = ago(x.created_at, i18n.language)
    const thing = pantry.rows.find((p) => p.id === x.pantry_item_id)
    return thing ? t('shopping.pichiPeeked', { level: thing.level, when }) : t('shopping.pichiNoticed', { when })
  }

  function row(x: Item, isBought: boolean) {
    const who = person(x.added_by)
    return (
      <Tick key={x.id} checked={isBought} onCommit={() => toggleItem(x, me)}>
        {(on, toggle) => (
      // Swipe the item left for Delete (Nora, 30 Oct); swiping anywhere else still changes the list.
      <SwipeRow right={[{ key: 'delete', label: t('common.delete'), icon: <TrashIcon />, color: 'var(--error-dark)', fill: 'var(--hero)', onClick: () => swipeDelete(x) }]}>
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
              {x.added_by_pichi ? pichiLine(x) : t('shopping.addedBy', { name: who?.display_name ?? t('common.someone'), when: ago(x.created_at, i18n.language) })}
            </div>
          )}
        </button>
        {x.added_by_pichi ? (
          <span className={`av-fade${on ? ' done' : ''}`}>
            {/* Like people's avatars open their profile, Pichi's opens her page. */}
            <Link to="/pichi" aria-label={t('pichi.title')} style={{ display: 'flex', borderRadius: '50%' }} onClick={(e) => e.stopPropagation()}>
              <PichiAvatar />
            </Link>
          </span>
        ) : who && (
          <span className={`av-fade${on ? ' done' : ''}`}>
            <PersonLink id={who.id}><Avatar avatar={who.avatar} label={who.display_name} /></PersonLink>
          </span>
        )}
      </div>
      </SwipeRow>
        )}
      </Tick>
    )
  }

  // Like Delete in the item's pop-up: if Pichi still sees it running low at home, she asks first.
  function swipeDelete(x: Item) {
    if (stillNeeded(x)) return setChecking(x)
    showUndo(t('shopping.itemDeleted'), t('common.undo'), db.removeWithUndo('list_items', x.id))
  }

  return (
    <Screen tabbar wide className="has-fab" doodle={toBuy.length ? 'stand-left' : undefined}>
      {/* One + sticker that turns into the add bar. Closed, it floats above the tab bar.
          Tapped, it settles into the bar while the field grows out of it. Phone only. */}
      {!desktop && (
      <Floating>
      {/* The typing bar, like the chat's: closed, just the floating +; tapped, the bar slides out from behind it,
          right above the keyboard. Sending adds the item and closes the keyboard (tap + again for the next one). */}
      <div className={`add-bar${adding ? ' open' : ''}`}>
        <TypingBar
          value={text}
          onChange={setText}
          onSend={(name) => {
            addItem(name)
            setAdding(false)
          }}
          placeholder={t('shopping.addItem')}
          fieldRef={inputRef}
          closed={!adding}
          onBlur={() => {
            // Close the bar again when it's left empty.
            if (!inputRef.current?.value.trim()) setAdding(false)
          }}
        />
        <button
          type="button"
          className="stk prim round add-fab"
          aria-label={t('shopping.addButton')}
          tabIndex={adding ? -1 : undefined}
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => {
            // Not the tap that just sent an item (the + sits right under Send).
            if (adding || justSent()) return
            // Focus right away, inside the tap, so the phone opens the keyboard; the bar slides out a moment later,
            // once the field is back in place, so the two moves don't collide.
            focusField(inputRef.current)
            requestAnimationFrame(() => requestAnimationFrame(() => setAdding(true)))
          }}
        >
          <PlusIcon />
        </button>
      </div>
      </Floating>
      )}
      <div style={{ padding: 'calc(var(--top) + 8px) 22px 0 40px', display: 'flex', flexDirection: 'column', gap: desktop ? 18 : 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: desktop ? 0 : -10 }}>
          {!desktop && (
            <button type="button" aria-label={t('common.back')} onClick={back} style={{ color: '#1E1A30', display: 'flex' }}>
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
        <div ref={tabsRow} style={{ position: 'relative', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', rowGap: 12 }}>
          <ListTabs lists={sortedLists} current={list?.id ?? null} onPick={pick} onReorder={reorderLists} />
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
            {grouped(toBuy)}
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
            <ArchiveLink
              title={t('archive.shoppingTitle')}
              people={people}
              rows={items.rows.filter((x) => x.checked_at && !recentlyBought(x)).map((x) => ({ id: x.id, name: x.name, at: x.checked_at as string, by: x.checked_by }))}
              onAgain={(r) => {
                const was = items.rows.find((x) => x.id === r.id)
                if (!list || !was) return
                db.insert('list_items', { list_id: list.id, name: was.name, category: was.category ?? null, added_by: me, created_at: new Date().toISOString(), checked_at: null, checked_by: null, position: 0 })
              }}
            />
          </div>
        </div>
      ) : (
      <div key={list?.id} className={slide} style={{ padding: '26px 22px 0 40px' }}>
        {grouped(toBuy)}
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
        {/* Bought before today: archived, with "Buy again" (Nora, 30 Oct). */}
        <ArchiveLink
          title={t('archive.shoppingTitle')}
          people={people}
          rows={items.rows.filter((x) => x.checked_at && !recentlyBought(x)).map((x) => ({ id: x.id, name: x.name, at: x.checked_at as string, by: x.checked_by }))}
          onAgain={(r) => {
            const was = items.rows.find((x) => x.id === r.id)
            if (!list || !was) return
            db.insert('list_items', { list_id: list.id, name: was.name, category: was.category ?? null, added_by: me, created_at: new Date().toISOString(), checked_at: null, checked_by: null, position: 0 })
          }}
        />
      </div>
      )}

      <Sheet small open={newList !== null} onClose={() => { setNewList(null); setMovingItem(null) }} title={t('shopping.newList')}>
        <form onSubmit={addList} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <input className="input" ref={autoFocusField} placeholder={t('shopping.newListPlaceholder')} aria-label={t('shopping.newList')} value={newList ?? ''} onChange={(e) => setNewList(e.target.value)} />
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

      {/* An item saves its name as you type (no Save button, Nora, 29 Oct); the trash can sits in the title row. */}
      <Sheet
        open={Boolean(editing)}
        onClose={closeItem}
        title={t('shopping.editItem')}
      >
        <div>
          <label className="label" htmlFor="item-name">
            {t('shopping.itemName')}
          </label>
          <input id="item-name" className="input" value={itemName} enterKeyHint="done" onChange={(e) => setItemName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()} />
        </div>
        {/* Its category in this list: tap one (again to clear it), or add a new one. */}
        {editing && (
          <div style={{ marginTop: 16 }}>
            <span className="label">{t('shopping.category')}</span>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              {categories.map((c) => (
                <Chip key={c} on={editing.category?.trim() === c} onClick={() => setCategory(editing, editing.category?.trim() === c ? null : c)}>
                  {c}
                </Chip>
              ))}
              {newCategory === null ? (
                <Chip on={false} onClick={() => setNewCategory('')}>
                  {t('shopping.addCategory')}
                </Chip>
              ) : (
                <form
                  className="row"
                  style={{ gap: 8, flex: '1 1 220px' }}
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (newCategory.trim()) setCategory(editing, newCategory.trim())
                    setNewCategory(null)
                  }}
                >
                  <input className="input" ref={autoFocusField} placeholder={t('shopping.categoryPlaceholder')} aria-label={t('shopping.category')} value={newCategory} enterKeyHint="done" onChange={(e) => setNewCategory(e.target.value)} onBlur={() => !newCategory.trim() && setNewCategory(null)} style={{ flex: 1 }} />
                  <button type="submit" className="stk prim sm" disabled={!newCategory.trim()}>
                    {t('common.add')}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
        {/* Which list it's on: tap another to move it there, or start a new list for it. */}
        {editing && (
          <div style={{ marginTop: 16 }}>
            <span className="label">{t('shopping.onList')}</span>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              {sortedLists.map((l) => (
                <Chip key={l.id} on={l.id === editing.list_id} onClick={() => moveItem(editing, l.id)}>
                  {l.name}
                </Chip>
              ))}
              <Chip
                on={false}
                onClick={() => {
                  setMovingItem(editing)
                  setNewList('')
                }}
              >
                {t('shopping.addList')}
              </Chip>
            </div>
          </div>
        )}
        {editing && (
          <div style={{ marginTop: 18 }}>
            <DeleteLink label={t('shopping.deleteItem')} onClick={removeItem} />
            <Comments target={{ item_id: editing.id }} />
          </div>
        )}
      </Sheet>

      <Sheet small open={Boolean(checking)} onClose={() => setChecking(null)} title={t('shopping.pantryCheck.title')}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 18 }}>
          <PoseStamp pose="honk" color="#F8E6A8" width={70} height={80} zoom={1.15} focus="50% 30%" rotate={-4} />
          <p className="body" style={{ margin: 0 }}>{checking ? t('shopping.pantryCheck.text', { item: checking.name }) : ''}</p>
        </div>
        <div className="row" style={{ gap: 12 }}>
          <button type="button" className="stk sec" style={{ flex: 1, transform: 'rotate(-1deg)', color: '#A8335A' }} onClick={() => { if (checking) db.remove('list_items', checking.id); setChecking(null) }}>
            {t('shopping.pantryCheck.delete')}
          </button>
          <button type="button" className="stk prim" style={{ flex: 1.3, transform: 'rotate(1deg)' }} onClick={() => setChecking(null)}>
            {t('shopping.pantryCheck.keep')}
          </button>
        </div>
      </Sheet>
    </Screen>
  )
}

/** The washi-tape tabs for the lists. Hold and drag a tab to move it (on a phone, press and hold first).
 *  The first list, Groceries, always stays first. */
function ListTabs({ lists, current, onPick, onReorder }: { lists: List[]; current: string | null; onPick: (l: List) => void; onReorder: (ids: string[]) => void }) {
  const first = lists[0]
  const rest = lists.slice(1)
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 6 } }),
  )
  function end(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return
    const ids = rest.map((l) => l.id)
    const next = arrayMove(ids, ids.indexOf(e.active.id as string), ids.indexOf(e.over.id as string))
    onReorder([first.id, ...next])
  }
  if (!first) return null
  return (
    <>
      <ListTab l={first} i={0} on={first.id === current} onPick={onPick} />
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={end}>
        <SortableContext items={rest.map((l) => l.id)} strategy={horizontalListSortingStrategy}>
          {rest.map((l, k) => (
            <SortableTab key={l.id} l={l} i={k + 1} on={l.id === current} onPick={onPick} />
          ))}
        </SortableContext>
      </DndContext>
    </>
  )
}

function SortableTab(props: { l: List; i: number; on: boolean; onPick: (l: List) => void }) {
  const { listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.l.id })
  return (
    <span
      ref={setNodeRef}
      {...listeners}
      style={{ display: 'inline-flex', transform: CSS.Translate.toString(transform), transition, zIndex: isDragging ? 3 : undefined, cursor: isDragging ? 'grabbing' : undefined, touchAction: 'manipulation' }}
    >
      <ListTab {...props} lifted={isDragging} />
    </span>
  )
}

function ListTab({ l, i, on, onPick, lifted }: { l: List; i: number; on: boolean; onPick: (l: List) => void; lifted?: boolean }) {
  return (
    <button
      type="button"
      className={TAB_TAPES[i % TAB_TAPES.length]}
      aria-pressed={on}
      onClick={() => onPick(l)}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        height: 30,
        padding: '0 14px',
        fontSize: 14,
        color: on ? '#1E1A30' : '#63586B',
        fontWeight: on ? 800 : 700,
        transform: lifted ? 'rotate(-4deg) scale(1.06)' : `rotate(${i % 2 ? 1.5 : -2}deg)`,
        boxShadow: lifted ? '3px 6px 10px rgba(30,26,48,.22)' : on ? '1px 2px 0 rgba(30,26,48,.12)' : undefined,
        opacity: on || lifted ? 1 : 0.75,
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
      }}
    >
      {l.name}
    </button>
  )
}
