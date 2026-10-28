import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useHousehold } from '../data/hooks'
import { Sheet } from '../components/Scrapbook'
import { PersonAddIcon } from '../components/Icons'
import { InviteSheet } from './Invite'

/** "Add something": from the round + on the phone, or "+ Add" in the desktop sidebar. */
export function AddSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { household } = useHousehold()
  const [inviting, setInviting] = useState(false)

  function go(to: string) {
    onClose()
    navigate(to)
  }

  return (
    <>
      <Sheet open={open} onClose={onClose} title={t('home.addWhat')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <button type="button" className="stk sec" style={{ transform: 'rotate(-1deg)' }} onClick={() => go('/shopping?add=1')}>
            {t('home.addItem')}
          </button>
          <button type="button" className="stk sec" style={{ transform: 'rotate(1deg)' }} onClick={() => go('/todos?add=1')}>
            {t('home.addTodo')}
          </button>
          <button type="button" className="stk sec" style={{ transform: 'rotate(-.5deg)' }} onClick={() => go('/notes/new')}>
            {t('home.addNote')}
          </button>
          {/* People get the violet sticker. */}
          <button
            type="button"
            className="stk violet"
            style={{ transform: 'rotate(1deg)' }}
            onClick={() => {
              onClose()
              setInviting(true)
            }}
          >
            <PersonAddIcon />
            {t('home.addSomeone')}
          </button>
        </div>
      </Sheet>
      <InviteSheet household={inviting ? household : null} onClose={() => setInviting(false)} />
    </>
  )
}
