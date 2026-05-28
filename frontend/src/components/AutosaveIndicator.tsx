import { cn } from '@/lib/utils'
import type { AutosaveStatus } from '@/hooks/useAutosaveDraft'

const LABELS: Record<Exclude<AutosaveStatus, 'idle'>, string> = {
  unsaved: 'Unsaved changes',
  saving: 'Saving…',
  saved: 'Draft saved',
}

export function AutosaveIndicator({ status }: { status: AutosaveStatus }) {
  if (status === 'idle') return null

  return (
    <span
      aria-live="polite"
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        status === 'unsaved'
          ? 'bg-muted text-muted-foreground'
          : status === 'saving'
            ? 'bg-secondary text-secondary-foreground'
            : 'bg-primary/10 text-primary',
      )}
    >
      <span aria-hidden>
        {status === 'unsaved' ? '●' : status === 'saving' ? '…' : '✓'}
      </span>
      {LABELS[status]}
    </span>
  )
}
