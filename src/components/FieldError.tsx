// Our own message for a field that needs fixing, instead of the browser's bubble (which can't be styled).
// Pair it with `aria-invalid` on the input: the field gets a pink edge and a small shake.

export function FieldError({ id, children }: { id: string; children: string }) {
  return (
    <p id={id} className="field-err" role="alert">
      <span className="field-err-mark" aria-hidden>
        {/* Drawn, not typed, so it sits in the exact middle of the sticker in every font. */}
        <svg viewBox="0 0 16 16" width="12" height="12">
          <path d="M8 3.2v5.4" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="8" cy="12.2" r="1.4" fill="#FFFFFF" />
        </svg>
      </span>
      {children}
    </p>
  )
}
