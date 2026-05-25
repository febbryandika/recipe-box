import { createFileRoute, Link, Outlet, useRouter } from '@tanstack/react-router'
import { authClient, useSession } from '@/lib/auth-client'

export const Route = createFileRoute('/_app')({
  component: AppLayout,
})

function AppLayout() {
  const router = useRouter()
  const { data, isPending } = useSession()

  async function handleLogout() {
    await authClient.signOut()
    await router.invalidate()
    router.navigate({ to: '/login' })
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b px-6 py-3 flex items-center gap-4">
        <Link to="/" className="font-semibold text-foreground hover:text-primary">
          Recipe Box
        </Link>
        <div className="ml-auto flex items-center gap-4">
          {isPending ? null : data?.user ? (
            <>
              <span className="text-sm text-muted-foreground">{data.user.name}</span>
              <button
                type="button"
                onClick={handleLogout}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Login
            </Link>
          )}
        </div>
      </nav>
      <main className="container mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  )
}
