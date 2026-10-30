import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Hand } from './Scrapbook'
import standRight from '../../assets/pichi/stand-right.webp'
import honk from '../../assets/pichi/honk.webp'

/**
 * Pichi says something, like a character in a game (Nora, 30 Oct): her painting in color hops up at the bottom of
 * the screen, and a paper speech bubble pops out next to her. For the moments she has something to ask, instead of
 * a plain pop-up. Tap outside to close.
 */
export function PichiSays({ open, title, onClose, pose = 'stand', children }: { open: boolean; title: string; onClose: () => void; pose?: 'stand' | 'honk'; children: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [open, onClose])
  if (!open) return null
  return createPortal(
    <div className="says-back" onClick={onClose}>
      <div className="says" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <img className="says-pichi" src={pose === 'honk' ? honk : standRight} alt="Pichi" />
        <div className="says-bubble">
          <Hand as="h2" size={28} lineHeight={30} style={{ margin: 0 }}>
            {title}
          </Hand>
          <div style={{ marginTop: 8 }}>{children}</div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
