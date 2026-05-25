import type { Ingredient } from '@/lib/recipe-schema'

type IngredientFieldErrors = Partial<Record<keyof Ingredient, string | undefined>>

type IngredientBuilderProps = {
  value: Ingredient[]
  onChange: (next: Ingredient[]) => void
  errors?: Array<IngredientFieldErrors | undefined>
}

const EMPTY_ROW: Ingredient = { amount: '', unit: '', name: '' }

const inputClass =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

export function IngredientBuilder({ value, onChange, errors }: IngredientBuilderProps) {
  const rows = value.length === 0 ? [EMPTY_ROW] : value

  function update(index: number, patch: Partial<Ingredient>) {
    const next = rows.map((row, i) => (i === index ? { ...row, ...patch } : row))
    onChange(next)
  }

  function remove(index: number) {
    if (rows.length === 1) {
      onChange([EMPTY_ROW])
      return
    }
    onChange(rows.filter((_, i) => i !== index))
  }

  function add() {
    onChange([...rows, { ...EMPTY_ROW }])
  }

  return (
    <div className="space-y-3">
      {rows.map((row, i) => {
        const rowErrors = errors?.[i]
        return (
          <div key={i} className="space-y-1">
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-3">
                <input
                  type="text"
                  value={row.amount}
                  onChange={(e) => update(i, { amount: e.target.value })}
                  placeholder="1"
                  aria-label={`Ingredient ${i + 1} amount`}
                  className={inputClass}
                />
              </div>
              <div className="col-span-3">
                <input
                  type="text"
                  value={row.unit}
                  onChange={(e) => update(i, { unit: e.target.value })}
                  placeholder="cup"
                  aria-label={`Ingredient ${i + 1} unit`}
                  className={inputClass}
                />
              </div>
              <div className="col-span-5">
                <input
                  type="text"
                  value={row.name}
                  onChange={(e) => update(i, { name: e.target.value })}
                  placeholder="flour"
                  aria-label={`Ingredient ${i + 1} name`}
                  className={inputClass}
                />
              </div>
              <div className="col-span-1 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => remove(i)}
                  aria-label={`Remove ingredient ${i + 1}`}
                  className="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  ×
                </button>
              </div>
            </div>
            {rowErrors ? (
              <div className="grid grid-cols-12 gap-2 text-xs text-destructive">
                <p className="col-span-3">{rowErrors.amount}</p>
                <p className="col-span-3">{rowErrors.unit}</p>
                <p className="col-span-5">{rowErrors.name}</p>
              </div>
            ) : null}
          </div>
        )
      })}

      <button
        type="button"
        onClick={add}
        className="inline-flex items-center gap-1 rounded-md border border-dashed px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
      >
        + Add ingredient
      </button>
    </div>
  )
}
