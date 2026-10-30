// Web addresses in comments and messages become tappable links (Nora, 29 Oct: "from IKEA, and maybe a link").
// They open in a new tab, and tapping one doesn't also tap the row or bubble around it.
// Tags of people in the household ("@Danko", Nora, 30 Oct) show in bold, in the theme color.

import { useHousehold } from '../data/hooks'

const URL = /(https?:\/\/[^\s<]+[^\s<.,:;"')\]!?])/g

function Tagged({ text, names }: { text: string; names: string[] }) {
  if (!names.length || !text.includes('@')) return <>{text}</>
  const escaped = names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).sort((a, b) => b.length - a.length)
  const parts = text.split(new RegExp(`(@(?:${escaped.join('|')}))(?![\\p{L}\\p{N}])`, 'giu'))
  return (
    <>
      {parts.map((part, i) =>
        i % 2 ? (
          <span key={i} className="mention">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </>
  )
}

export function Linkify({ text }: { text: string }) {
  const { people } = useHousehold()
  const names = people.map((p) => p.display_name).filter(Boolean)
  const parts = text.split(URL)
  return (
    <>
      {parts.map((part, i) =>
        i % 2 ? (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-link" onClick={(e) => e.stopPropagation()}>
            {part.replace(/^https?:\/\/(www\.)?/, '')}
          </a>
        ) : (
          <Tagged key={i} text={part} names={names} />
        ),
      )}
    </>
  )
}
