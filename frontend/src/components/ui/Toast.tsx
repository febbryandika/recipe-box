import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { cn } from '@/lib/cn'

type ToastVariant = 'error' | 'success'
type ToastAction = { label: string; onClick: () => void }

type ToastOptions = {
  title: string
  description?: string
  variant?: ToastVariant
  action?: ToastAction
  duration?: number
}

type ToastItem = ToastOptions & { id: number; variant: ToastVariant }

type ToastContextValue = {
  toast: (options: ToastOptions) => number
  dismiss: (id: number) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)
const DEFAULT_DURATION = 6000

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const idRef = useRef(0)
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>())

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const toast = useCallback(
    (options: ToastOptions) => {
      const id = ++idRef.current
      setToasts((prev) => [
        ...prev,
        { ...options, id, variant: options.variant ?? 'error' },
      ])
      const duration = options.duration ?? DEFAULT_DURATION
      if (duration > 0) {
        timers.current.set(id, setTimeout(() => dismiss(id), duration))
      }
      return id
    },
    [dismiss],
  )

  useEffect(() => {
    const map = timers.current
    return () => {
      map.forEach(clearTimeout)
      map.clear()
    }
  }, [])

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[]
  onDismiss: (id: number) => void
}) {
  if (toasts.length === 0) return null
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end">
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ToastItem
  onDismiss: (id: number) => void
}) {
  const isError = toast.variant === 'error'
  return (
    <div
      role="status"
      aria-live={isError ? 'assertive' : 'polite'}
      className={cn(
        'pointer-events-auto w-full max-w-sm rounded-lg border bg-card p-4 shadow-lg',
        isError ? 'border-destructive/40' : 'border-border',
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 space-y-1">
          <p
            className={cn(
              'text-sm font-medium',
              isError ? 'text-destructive' : 'text-foreground',
            )}
          >
            {toast.title}
          </p>
          {toast.description ? (
            <p className="text-sm text-muted-foreground">{toast.description}</p>
          ) : null}
          {toast.action ? (
            <button
              type="button"
              onClick={() => {
                toast.action!.onClick()
                onDismiss(toast.id)
              }}
              className="mt-1 text-sm font-medium text-primary hover:underline"
            >
              {toast.action.label}
            </button>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          aria-label="Dismiss notification"
          className="shrink-0 text-muted-foreground transition hover:text-foreground"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
