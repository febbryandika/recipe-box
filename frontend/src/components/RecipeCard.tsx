import { Link } from '@tanstack/react-router'
import type { InferResponseType } from 'hono/client'
import { client } from '@/lib/client'

type Recipe = InferResponseType<typeof client.api.recipes.$get>[number]

const MAX_VISIBLE_TAGS = 3

export function RecipeCard({ recipe }: { recipe: Recipe }) {
  const visibleTags = recipe.tags.slice(0, MAX_VISIBLE_TAGS)
  const hiddenCount = recipe.tags.length - visibleTags.length

  return (
    <Link
      to="/recipes/$recipeId"
      params={{ recipeId: recipe.id }}
      className="group flex flex-col overflow-hidden rounded-lg border bg-card transition hover:border-primary/40 hover:shadow-md"
    >
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        {recipe.coverImageUrl ? (
          <img
            src={recipe.coverImageUrl}
            alt={recipe.title}
            className="h-full w-full object-cover transition group-hover:scale-[1.02]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted-foreground/10 text-4xl text-muted-foreground/60">
            <span aria-hidden>🍳</span>
          </div>
        )}
        {recipe.isPublic ? (
          <span className="absolute right-2 top-2 rounded-full bg-background/80 px-2 py-0.5 text-xs font-medium text-foreground backdrop-blur">
            Public
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <h3 className="line-clamp-2 font-semibold leading-tight text-foreground">
          {recipe.title}
        </h3>

        <div className="mt-auto flex flex-wrap items-center gap-1.5">
          {recipe.cookTimeMinutes != null ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
              <span aria-hidden>⏱</span>
              {recipe.cookTimeMinutes} min
            </span>
          ) : null}
          {visibleTags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground"
            >
              {tag}
            </span>
          ))}
          {hiddenCount > 0 ? (
            <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
              +{hiddenCount}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  )
}
