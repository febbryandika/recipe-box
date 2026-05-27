import { useEffect, useMemo, useRef } from 'react'

type Debounced<T extends (...args: never[]) => void> = T & { cancel: () => void }

export function useDebouncedCallback<T extends (...args: never[]) => void>(
  fn: T,
  delay = 300,
): Debounced<T> {
  const fnRef = useRef(fn)
  fnRef.current = fn

  const debounced = useMemo<Debounced<T>>(() => {
    let timer: ReturnType<typeof setTimeout> | null = null
    const wrapped = ((...args: Parameters<T>) => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => fnRef.current(...args), delay)
    }) as Debounced<T>
    wrapped.cancel = () => {
      if (timer) clearTimeout(timer)
      timer = null
    }
    return wrapped
  }, [delay])

  useEffect(() => () => debounced.cancel(), [debounced])

  return debounced
}
