import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/_authed/recipes/new')({
  component: NewRecipePage,
})

function NewRecipePage() {
  return <h1 className="text-2xl font-semibold">New recipe</h1>
}
