import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ShareToggle } from '@/components/ShareToggle'
import {
  recipeQueryOptions,
  RecipeNotFoundError,
} from '@/lib/recipe-queries'

export const Route = createFileRoute('/_app/_authed/recipes/$recipeId/')({
  loader: ({ context, params }) =>
    context.queryClient
      .ensureQueryData(recipeQueryOptions(params.recipeId))
      .catch(() => {
        // Swallow — useQuery surfaces the error state below.
      }),
  component: RecipePage,
})

function RecipePage() {
  const { recipeId } = Route.useParams()
  const query = useQuery(recipeQueryOptions(recipeId))

  if (query.isPending) {
    return <DetailSkeleton />
  }

  if (query.isError && query.error instanceof RecipeNotFoundError) {
    return <NotFoundView />
  }

  if (query.isError) {
    return (
      <ErrorState
        message={
          query.error instanceof Error
            ? query.error.message
            : 'Something went wrong'
        }
        onRetry={() => query.refetch()}
      />
    )
  }

  const recipe = query.data

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <header className="flex items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          {recipe.title}
        </h1>
        <Link
          to="/recipes/$recipeId/edit"
          params={{ recipeId }}
          className="inline-flex shrink-0 items-center rounded-md border px-3 py-2 text-sm font-medium transition hover:bg-muted"
        >
          Edit
        </Link>
      </header>

      {recipe.coverImageUrl ? (
        <div className="aspect-video w-full overflow-hidden rounded-lg bg-muted">
          <img
            src={recipe.coverImageUrl}
            alt={recipe.title}
            className="h-full w-full object-cover"
          />
        </div>
      ) : null}

      <ShareToggle recipe={recipe} />
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div className="h-8 w-2/3 animate-pulse rounded-md bg-muted" />
      <div className="h-32 animate-pulse rounded-lg bg-muted" />
    </div>
  )
}

function NotFoundView() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16 text-center">
      <p className="text-lg font-medium text-foreground">Recipe not found</p>
      <p className="text-sm text-muted-foreground">
        It may have been deleted or never existed.
      </p>
      <Link
        to="/"
        className="mt-2 inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
      >
        Back to recipes
      </Link>
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
