import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ShareToggle } from '@/components/ShareToggle'
import { buttonClassName } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
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
      <div className="mx-auto w-full max-w-2xl">
        <ErrorState
          title="Couldn't load recipe"
          message={
            query.error instanceof Error
              ? query.error.message
              : 'Something went wrong'
          }
          onRetry={() => query.refetch()}
        />
      </div>
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
          className={buttonClassName({ variant: 'outline', className: 'shrink-0' })}
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
    <div className="mx-auto w-full max-w-2xl">
      <EmptyState
        title="Recipe not found"
        description="It may have been deleted or never existed."
        action={
          <Link to="/" className={buttonClassName()}>
            Back to recipes
          </Link>
        }
      />
    </div>
  )
}
