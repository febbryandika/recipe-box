import { Link } from '@tanstack/react-router'
import { EmptyState } from './ui/EmptyState'
import { buttonClassName } from './ui/Button'

export function RouteNotFound() {
  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12">
      <EmptyState
        title="Page not found"
        description="The page you're looking for doesn't exist."
        action={
          <Link to="/" className={buttonClassName()}>
            Back to home
          </Link>
        }
      />
    </div>
  )
}
