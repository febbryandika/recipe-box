import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import {
  ALLOWED_COVER_TYPES,
  validateCoverFile,
} from '@/lib/recipe-uploads'
import { Button } from '@/components/ui/Button'

type Props = {
  existingUrl: string | null
  file: File | null
  onFileChange: (file: File | null) => void
  error?: string | null
  onError?: (message: string | null) => void
  disabled?: boolean
}

export function CoverImageInput({
  existingUrl,
  file,
  onFileChange,
  error,
  onError,
  disabled,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const shownSrc = previewUrl ?? existingUrl
  const hasImage = Boolean(shownSrc)

  function handleSelect(e: ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0]
    e.target.value = ''
    if (!picked) return

    const result = validateCoverFile(picked)
    if (!result.ok) {
      onError?.(result.message)
      return
    }
    onError?.(null)
    onFileChange(picked)
  }

  function handleClear() {
    onError?.(null)
    onFileChange(null)
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Cover image</label>

      <div className="relative aspect-video w-full overflow-hidden rounded-md border border-input bg-muted">
        {hasImage ? (
          <img
            src={shownSrc as string}
            alt="Recipe cover preview"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted-foreground/10 text-4xl text-muted-foreground/60">
            <span aria-hidden>🍳</span>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_COVER_TYPES.join(',')}
        onChange={handleSelect}
        disabled={disabled}
        className="sr-only"
        aria-label="Choose cover image"
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
        >
          {hasImage ? 'Replace image' : 'Choose image'}
        </Button>
        {file ? (
          <Button
            variant="outline"
            size="sm"
            onClick={handleClear}
            disabled={disabled}
            className="text-muted-foreground hover:text-foreground"
          >
            Cancel change
          </Button>
        ) : null}
        <p className="text-xs text-muted-foreground">
          JPG, PNG, or WEBP · up to 5MB
        </p>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive"
        >
          {error}
        </p>
      ) : null}
    </div>
  )
}
