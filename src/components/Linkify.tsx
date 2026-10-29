// Web addresses in comments and messages become tappable links (Nora, 29 Oct: "from IKEA, and maybe a link").
// They open in a new tab, and tapping one doesn't also tap the row or bubble around it.

const URL = /(https?:\/\/[^\s<]+[^\s<.,:;"')\]!?])/g

export function Linkify({ text }: { text: string }) {
  const parts = text.split(URL)
  return (
    <>
      {parts.map((part, i) =>
        i % 2 ? (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-link" onClick={(e) => e.stopPropagation()}>
            {part.replace(/^https?:\/\/(www\.)?/, '')}
          </a>
        ) : (
          part
        ),
      )}
    </>
  )
}
