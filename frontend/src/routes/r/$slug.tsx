import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/r/$slug')({
  component: PublicRecipePage,
})

function PublicRecipePage() {
  const { slug } = Route.useParams()
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-2 px-6 text-center">
      <h1 className="text-3xl font-bold tracking-tight">Public recipe</h1>
      <p className="text-muted-foreground">slug: {slug}</p>
    </div>
  )
}
