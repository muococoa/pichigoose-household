// Our own message for a field that needs fixing, instead of the browser's bubble (which can't be styled).
// Pair it with `aria-invalid` on the input: the field gets a pink edge and a small shake.

export function FieldError({ id, children }: { id: string; children: string }) {
  return (
    <p id={id} className="field-err" role="alert">
      <span className="field-err-mark" aria-hidden>
        !
      </span>
      {children}
    </p>
  )
}
