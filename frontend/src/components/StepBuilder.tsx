type StepBuilderProps = {
  value: string[]
  onChange: (next: string[]) => void
  errors?: Array<string | undefined>
}

export function StepBuilder({ value, onChange, errors }: StepBuilderProps) {
  const rows = value.length === 0 ? [''] : value

  function update(index: number, text: string) {
    const next = rows.map((row, i) => (i === index ? text : row))
    onChange(next)
  }

  function remove(index: number) {
    if (rows.length === 1) {
      onChange([''])
      return
    }
    onChange(rows.filter((_, i) => i !== index))
  }

  function add() {
    onChange([...rows, ''])
  }

  return (
    <div className="space-y-3">
      {rows.map((step, i) => {
        const error = errors?.[i]
        return (
          <div key={i} className="space-y-1">
            <div className="flex items-start gap-3">
              <span className="mt-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium text-secondary-foreground">
                {i + 1}
              </span>
              <textarea
                value={step}
                onChange={(e) => update(i, e.target.value)}
                placeholder="Describe this step…"
                rows={2}
                aria-label={`Step ${i + 1}`}
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label={`Remove step ${i + 1}`}
                className="mt-1 rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                ×
              </button>
            </div>
            {error ? <p className="ml-9 text-xs text-destructive">{error}</p> : null}
          </div>
        )
      })}

      <button
        type="button"
        onClick={add}
        className="inline-flex items-center gap-1 rounded-md border border-dashed px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
      >
        + Add step
      </button>
    </div>
  )
}
