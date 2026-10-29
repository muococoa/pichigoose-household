import { useState } from 'react'

/**
 * The one toggle in the app (Nora, 29 Oct): a round pill with a round thumb that springs to the chosen side.
 * Border and thumb follow the theme. Reuse this for every two- or three-way choice; the look lives in app.css (.toggle).
 */
export function Toggle<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  label: string
}) {
  const at = Math.max(0, options.findIndex((o) => o.value === value))
  // Counts changes, so the squash plays on every change but not when the page opens.
  const [moves, setMoves] = useState(0)
  return (
    <div role="radiogroup" aria-label={label} className="toggle" style={{ ['--n' as string]: options.length, ['--at' as string]: at }}>
      {/* The same thumb slides across; its squash swaps between two identical animations so it plays again each time. */}
      <span className={`toggle-thumb${moves ? ` s${moves % 2}` : ''}`} aria-hidden />
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={o.value === value} onClick={() => {
            if (o.value === value) return
            setMoves((n) => n + 1)
            onChange(o.value)
          }}>
          {o.label}
        </button>
      ))}
    </div>
  )
}
