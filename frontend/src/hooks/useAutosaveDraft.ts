import { useEffect, useRef, useState } from 'react'
import { useDebouncedCallback } from './useDebouncedCallback'

export type AutosaveStatus = 'idle' | 'unsaved' | 'saving' | 'saved'

export function loadDraft<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw == null ? null : (JSON.parse(raw) as T)
  } catch {
    return null
  }
}

type Options = {
  delay?: number
  enabled?: boolean
}

// Brief pause so the transient "saving" state is perceivable — the write itself is synchronous.
const SAVED_DISPLAY_DELAY = 400

export function useAutosaveDraft<T>(
  key: string,
  value: T,
  { delay = 1000, enabled = true }: Options = {},
): { status: AutosaveStatus; clearDraft: () => void } {
  const [status, setStatus] = useState<AutosaveStatus>('idle')
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const save = useDebouncedCallback((data: string) => {
    setStatus('saving')
    try {
      localStorage.setItem(key, data)
    } catch {
      // ignore quota / private-mode write failures
    }
    if (savedTimer.current) clearTimeout(savedTimer.current)
    savedTimer.current = setTimeout(() => setStatus('saved'), SAVED_DISPLAY_DELAY)
  }, delay)

  const serialized = JSON.stringify(value)
  // Seeded with the mount-time value so restoring a draft (or a StrictMode
  // double-mount) doesn't count as a change and trigger a spurious save.
  const lastSeen = useRef(serialized)

  useEffect(() => {
    if (serialized === lastSeen.current) return
    if (!enabled) {
      setStatus('idle')
      return
    }
    lastSeen.current = serialized
    setStatus('unsaved')
    save(serialized)
  }, [serialized, enabled, save])

  useEffect(
    () => () => {
      if (savedTimer.current) clearTimeout(savedTimer.current)
    },
    [],
  )

  function clearDraft() {
    save.cancel()
    if (savedTimer.current) clearTimeout(savedTimer.current)
    try {
      localStorage.removeItem(key)
    } catch {
      // ignore
    }
    setStatus('idle')
  }

  return { status, clearDraft }
}
