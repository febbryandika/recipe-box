import { createFileRoute, Link } from '@tanstack/react-router'
import { queryOptions, useQuery } from '@tanstack/react-query'
import { client } from '@/lib/client'
import { RecipeCard } from '@/components/RecipeCard'
import { RecipeSkeleton } from '@/components/RecipeSkeleton'

const recipesQueryOptions = queryOptions({
  queryKey: ['recipes'],
  queryFn: async () => {
    const res = await client.api.recipes.$get()
    if (!res.ok) throw new Error('Failed to load recipes')
    return res.json()
  },
})

export const Route = createFileRoute('/_app/_authed/')({
  component: RecipeGridPage,
})

function RecipeGridPage() {
  const query = useQuery(recipesQueryOptions)

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
        <EmptyState />
      ) : (
        <RecipeGrid>
          {query.data.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
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
