import { createFileRoute, Link, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_app')({
  component: AppLayout,
})

function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b px-6 py-3 flex items-center gap-4">
        <Link to="/" className="font-semibold text-foreground hover:text-primary">
          Recipe Box
        </Link>
        <div className="ml-auto flex items-center gap-4">
          <Link
            to="/login"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Login
          </Link>
        </div>
      </nav>
      <main className="container mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  )
}
