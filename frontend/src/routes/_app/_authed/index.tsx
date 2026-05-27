import { useEffect, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { keepPreviousData, queryOptions, useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { client } from '@/lib/client'
import { RecipeCard } from '@/components/RecipeCard'
import { RecipeFilters } from '@/components/RecipeFilters'
import { RecipeSkeleton } from '@/components/RecipeSkeleton'
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback'

const searchSchema = z.object({
  search: z
    .string()
    .trim()
    .min(1)
    .optional()
    .catch(undefined),
  tag: z
    .string()
    .trim()
    .min(1)
    .optional()
    .catch(undefined),
})

type RecipeFiltersValue = z.infer<typeof searchSchema>

function recipesQueryOptions({ search, tag }: RecipeFiltersValue) {
  return queryOptions({
    queryKey: ['recipes', { search: search ?? null, tag: tag ?? null }],
    queryFn: async () => {
      const res = await client.api.recipes.$get({ query: { search, tag } })
      if (!res.ok) throw new Error('Failed to load recipes')
      return res.json()
    },
    placeholderData: keepPreviousData,
  })
}

export const Route = createFileRoute('/_app/_authed/')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(recipesQueryOptions(deps)),
  component: RecipeGridPage,
})

function RecipeGridPage() {
  const { search, tag } = Route.useSearch()
  const navigate = Route.useNavigate()

  const [inputValue, setInputValue] = useState(search ?? '')

  const pushSearch = useDebouncedCallback((value: string) => {
    const next = value.trim() || undefined
    navigate({ search: (prev) => ({ ...prev, search: next }), replace: true })
  }, 300)

  const handleSearchChange = (value: string) => {
    setInputValue(value)
    pushSearch(value)
  }

  // Sync URL → input when changed externally (back/forward, Clear filters).
  // Cancel pending pushes so stale typing doesn't undo the external change.
  useEffect(() => {
    pushSearch.cancel()
    setInputValue((current) => ((search ?? '') === current.trim() ? current : (search ?? '')))
  }, [search, pushSearch])

  const query = useQuery(recipesQueryOptions({ search, tag }))
  const hasFilters = Boolean(search || tag)

  const clearTag = () =>
    navigate({ search: (prev) => ({ ...prev, tag: undefined }), replace: true })

  const clearAllFilters = () => {
    pushSearch.cancel()
    setInputValue('')
    navigate({ search: {}, replace: true })
  }

  const setTag = (next: string) =>
    navigate({ search: (prev) => ({ ...prev, tag: next }), replace: true })

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">My Recipes</h1>
        <Link
          to="/recipes/new"
          className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          New recipe
        </Link>
      </header>

      <RecipeFilters
        value={inputValue}
        onSearchChange={handleSearchChange}
        activeTag={tag}
        onClearTag={clearTag}
      />

      {query.isPending ? (
        <RecipeGrid>
          {Array.from({ length: 6 }).map((_, i) => (
            <RecipeSkeleton key={i} />
          ))}
        </RecipeGrid>
      ) : query.isError ? (
        <ErrorState
          message={query.error instanceof Error ? query.error.message : 'Something went wrong'}
          onRetry={() => query.refetch()}
        />
      ) : query.data.length === 0 ? (
        hasFilters ? (
          <NoMatchesState onClearFilters={clearAllFilters} />
        ) : (
          <EmptyState />
        )
      ) : (
        <RecipeGrid>
          {query.data.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} onTagClick={setTag} />
          ))}
        </RecipeGrid>
      )}
    </div>
  )
}

function RecipeGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {children}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16 text-center">
      <p className="text-lg font-medium text-foreground">No recipes yet</p>
      <p className="text-sm text-muted-foreground">
        Save your first recipe and it'll appear here.
      </p>
      <Link
        to="/recipes/new"
        className="mt-2 inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
      >
        Create your first recipe
      </Link>
    </div>
  )
}

function NoMatchesState({ onClearFilters }: { onClearFilters: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16 text-center">
      <p className="text-lg font-medium text-foreground">No recipes match your filters</p>
      <p className="text-sm text-muted-foreground">
        Try a different search term or remove the tag filter.
      </p>
      <button
        type="button"
        onClick={onClearFilters}
        className="mt-2 inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium transition hover:bg-muted"
      >
        Clear filters
      </button>
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-destructive/40 bg-destructive/5 py-16 text-center">
      <p className="text-lg font-medium text-foreground">Couldn't load recipes</p>
      <p className="text-sm text-muted-foreground">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium transition hover:bg-muted"
      >
        Try again
      </button>
    </div>
  )
}
