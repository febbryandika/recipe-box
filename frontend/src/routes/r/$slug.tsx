import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  publicRecipeQueryOptions,
  RecipeNotFoundError,
  type PublicRecipe,
} from '@/lib/recipe-queries'

export const Route = createFileRoute('/r/$slug')({
  loader: ({ context, params }) =>
    context.queryClient
      .ensureQueryData(publicRecipeQueryOptions(params.slug))
      .catch(() => {
        // Swallow — useQuery surfaces the error state below.
      }),
  component: PublicRecipePage,
})

function PublicRecipePage() {
  const { slug } = Route.useParams()
  const query = useQuery(publicRecipeQueryOptions(slug))

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-3">
        <Link
          to="/"
          className="font-semibold text-foreground hover:text-primary"
        >
          Recipe Box
        </Link>
      </header>

      <main className="container mx-auto px-6 py-8">
        {query.isPending ? (
          <PublicSkeleton />
        ) : query.isError && query.error instanceof RecipeNotFoundError ? (
          <NotFoundView />
        ) : query.isError ? (
          <ErrorState
            message={
              query.error instanceof Error
                ? query.error.message
                : 'Something went wrong'
            }
            onRetry={() => query.refetch()}
          />
        ) : (
          <RecipeView recipe={query.data} />
        )}
      </main>
    </div>
  )
}

function RecipeView({ recipe }: { recipe: PublicRecipe }) {
  return (
    <article className="mx-auto w-full max-w-2xl space-y-6">
      {recipe.coverImageUrl ? (
        <div className="aspect-video w-full overflow-hidden rounded-lg bg-muted">
          <img
            src={recipe.coverImageUrl}
            alt={recipe.title}
            className="h-full w-full object-cover"
          />
        </div>
      ) : null}

      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{recipe.title}</h1>
        {recipe.description ? (
          <p className="text-muted-foreground">{recipe.description}</p>
        ) : null}
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          {recipe.cookTimeMinutes != null ? (
            <span>⏱ {recipe.cookTimeMinutes} min</span>
          ) : null}
          {recipe.servings != null ? (
            <span>🍽 {recipe.servings} servings</span>
          ) : null}
        </div>
        {recipe.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {recipe.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </header>

      {recipe.ingredientsJson.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Ingredients</h2>
          <ul className="space-y-1 text-sm">
            {recipe.ingredientsJson.map((ing, idx) => (
              <li key={idx} className="flex items-baseline gap-2">
                <span className="font-medium">
                  {[ing.amount, ing.unit].filter(Boolean).join(' ')}
                </span>
                <span>{ing.name}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {recipe.stepsJson.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Steps</h2>
          <ol className="space-y-3 text-sm">
            {recipe.stepsJson.map((step, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                  {idx + 1}
                </span>
                <p className="flex-1 whitespace-pre-wrap">{step}</p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </article>
  )
}

function PublicSkeleton() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div className="aspect-video w-full animate-pulse rounded-lg bg-muted" />
      <div className="space-y-2">
        <div className="h-8 w-2/3 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-full animate-pulse rounded-md bg-muted" />
      </div>
      <div className="h-40 animate-pulse rounded-md bg-muted" />
    </div>
  )
}

function NotFoundView() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16 text-center">
      <p className="text-lg font-medium text-foreground">Recipe not found</p>
      <p className="text-sm text-muted-foreground">
        This recipe may have been unpublished or never existed.
      </p>
    </div>
  )
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center justify-center gap-3 rounded-lg border border-destructive/40 bg-destructive/5 py-16 text-center">
      <p className="text-lg font-medium text-foreground">
        Couldn't load recipe
      </p>
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
