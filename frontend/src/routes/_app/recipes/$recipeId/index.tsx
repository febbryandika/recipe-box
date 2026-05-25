import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/recipes/$recipeId/')({
  component: RecipePage,
})

function RecipePage() {
  const { recipeId } = Route.useParams()
  return <h1 className="text-2xl font-semibold">Recipe — {recipeId}</h1>
}
