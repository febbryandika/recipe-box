import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/_authed/recipes/$recipeId/edit')({
  component: EditRecipePage,
})

function EditRecipePage() {
  const { recipeId } = Route.useParams()
  return <h1 className="text-2xl font-semibold">Edit recipe — {recipeId}</h1>
}
