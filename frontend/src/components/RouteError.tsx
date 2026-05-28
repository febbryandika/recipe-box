import type { ErrorComponentProps } from '@tanstack/react-router'
import { ErrorState } from './ui/ErrorState'

export function RouteError({ error, reset }: ErrorComponentProps) {
  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12">
      <ErrorState
        message={
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred.'
        }
        onRetry={reset}
      />
    </div>
  )
}
