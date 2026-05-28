import { useEffect, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { keepPreviousData, queryOptions, useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { client } from '@/lib/client'
import { RecipeCard } from '@/components/RecipeCard'
import { RecipeFilters } from '@/components/RecipeFilters'
import { RecipeSkeleton } from '@/components/RecipeSkeleton'
import { Button, buttonClassName } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
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
    context.queryClient.ensureQueryData(recipesQueryOptions(deps)).catch(() => {
      // Swallow — useQuery surfaces the error state below.
    }),
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
        <Link to="/recipes/new" className={buttonClassName()}>
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
          title="Couldn't load recipes"
          message={query.error instanceof Error ? query.error.message : 'Something went wrong'}
          onRetry={() => query.refetch()}
        />
      ) : query.data.length === 0 ? (
        hasFilters ? (
          <EmptyState
            title="No recipes match your filters"
            description="Try a different search term or remove the tag filter."
            action={
              <Button variant="outline" onClick={clearAllFilters}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon="🍳"
            title="No recipes yet"
            description="Save your first recipe and it'll appear here."
            action={
              <Link to="/recipes/new" className={buttonClassName()}>
                Create your first recipe
              </Link>
            }
          />
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

