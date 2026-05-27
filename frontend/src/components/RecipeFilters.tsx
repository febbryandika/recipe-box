type Props = {
  value: string
  onSearchChange: (value: string) => void
  activeTag: string | undefined
  onClearTag: () => void
}

export function RecipeFilters({ value, onSearchChange, activeTag, onClearTag }: Props) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <input
          type="search"
          value={value}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search recipes by title…"
          aria-label="Search recipes"
          className="w-full rounded-md border bg-background px-3 py-2 pr-9 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        {value ? (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <span aria-hidden>×</span>
          </button>
        ) : null}
      </div>

      {activeTag ? (
        <button
          type="button"
          onClick={onClearTag}
          className="inline-flex items-center gap-1.5 self-start rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary transition hover:bg-primary/15"
        >
          <span>Tag: {activeTag}</span>
          <span aria-hidden>×</span>
          <span className="sr-only">Clear tag filter</span>
        </button>
      ) : null}
    </div>
  )
}
