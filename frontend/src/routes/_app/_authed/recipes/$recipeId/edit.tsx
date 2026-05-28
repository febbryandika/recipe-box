import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { InferRequestType } from 'hono/client'
import { client } from '@/lib/client'
import {
  recipeQueryOptions,
  RecipeNotFoundError,
  type Recipe,
} from '@/lib/recipe-queries'
import { uploadCover } from '@/lib/recipe-uploads'
import { CoverImageInput } from '@/components/CoverImageInput'

type UpdateRecipePayload = InferRequestType<
  (typeof client.api.recipes)[':id']['$put']
>['json']
type Ingredient = { amount: string; unit: string; name: string }

export const Route = createFileRoute('/_app/_authed/recipes/$recipeId/edit')({
  loader: ({ context, params }) =>
    context.queryClient
      .ensureQueryData(recipeQueryOptions(params.recipeId))
      .catch(() => {
        // Swallow — the component's useQuery will surface the error state.
      }),
  component: EditRecipePage,
})

function EditRecipePage() {
  const { recipeId } = Route.useParams()
  const query = useQuery(recipeQueryOptions(recipeId))

  return (
    <div className="mx-auto w-full max-w-2xl">
      <header className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Edit recipe</h1>
      </header>

      {query.isPending ? (
        <EditSkeleton />
      ) : query.isError && query.error instanceof RecipeNotFoundError ? (
        <NotFoundView />
      ) : query.isError ? (
        <ErrorState
          message={
            query.error instanceof Error
              ? query.error.message
              : 'Something went wrong'
          }
          onRetry={() => query.refetch()}
        />
      ) : (
        <RecipeEditForm id={recipeId} initial={query.data} />
      )}
    </div>
  )
}

function RecipeEditForm({ id, initial }: { id: string; initial: Recipe }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [title, setTitle] = useState(initial.title)
  const [description, setDescription] = useState(initial.description ?? '')
  const [cookTimeMinutes, setCookTimeMinutes] = useState(
    initial.cookTimeMinutes != null ? String(initial.cookTimeMinutes) : '',
  )
  const [servings, setServings] = useState(
    initial.servings != null ? String(initial.servings) : '',
  )
  const [tags, setTags] = useState<string[]>(initial.tags)
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    initial.ingredientsJson.length > 0
      ? initial.ingredientsJson
      : [{ amount: '', unit: '', name: '' }],
  )
  const [steps, setSteps] = useState<string[]>(
    initial.stepsJson.length > 0 ? initial.stepsJson : [''],
  )
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverError, setCoverError] = useState<string | null>(null)
  const [isUploadingCover, setIsUploadingCover] = useState(false)
  const [coverUploadError, setCoverUploadError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: async (payload: UpdateRecipePayload) => {
      const res = await client.api.recipes[':id'].$put({
        param: { id },
        json: payload,
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null
        throw new Error(body?.error ?? 'Failed to save recipe')
      }
      return res.json()
    },
    onSuccess: async () => {
      if (coverFile) {
        setIsUploadingCover(true)
        try {
          await uploadCover(id, coverFile)
        } catch (err) {
          setIsUploadingCover(false)
          setCoverUploadError(
            err instanceof Error ? err.message : 'Failed to upload cover image',
          )
          queryClient.invalidateQueries({ queryKey: ['recipes'] })
          queryClient.invalidateQueries({ queryKey: ['recipe', id] })
          return
        }
        setIsUploadingCover(false)
      }
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
      queryClient.invalidateQueries({ queryKey: ['recipe', id] })
      navigate({ to: '/recipes/$recipeId', params: { recipeId: id } })
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmedTitle = title.trim()
    if (!trimmedTitle) return

    mutation.mutate({
      title: trimmedTitle,
      description: description.trim() || null,
      coverImageUrl: initial.coverImageUrl,
      cookTimeMinutes: parseIntOrNull(cookTimeMinutes),
      servings: parseIntOrNull(servings),
      ingredients: ingredients.filter(
        (i) => i.amount.trim() || i.unit.trim() || i.name.trim(),
      ),
      steps: steps.map((s) => s.trim()).filter((s) => s.length > 0),
      tags,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-1">
        <label htmlFor="title" className="text-sm font-medium">
          Title
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="e.g. Weeknight pasta"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="description" className="text-sm font-medium">
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="A short summary"
        />
      </div>

      <CoverImageInput
        existingUrl={initial.coverImageUrl}
        file={coverFile}
        onFileChange={setCoverFile}
        error={coverError}
        onError={setCoverError}
        disabled={mutation.isPending || isUploadingCover}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="cookTime" className="text-sm font-medium">
            Cook time (minutes)
          </label>
          <input
            id="cookTime"
            type="number"
            inputMode="numeric"
            min={1}
            value={cookTimeMinutes}
            onChange={(e) => setCookTimeMinutes(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="30"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="servings" className="text-sm font-medium">
            Servings
          </label>
          <input
            id="servings"
            type="number"
            inputMode="numeric"
            min={1}
            value={servings}
            onChange={(e) => setServings(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="4"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Tags</label>
        <TagInput tags={tags} onChange={setTags} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Ingredients</label>
          <button
            type="button"
            onClick={() =>
              setIngredients((prev) => [
                ...prev,
                { amount: '', unit: '', name: '' },
              ])
            }
            className="text-sm font-medium text-primary hover:underline"
          >
            + Add ingredient
          </button>
        </div>
        <div className="space-y-2">
          {ingredients.map((ing, idx) => (
            <div
              key={idx}
              className="grid grid-cols-[1fr_1fr_2fr_auto] gap-2"
            >
              <input
                type="text"
                value={ing.amount}
                onChange={(e) =>
                  setIngredients((prev) =>
                    prev.map((p, i) =>
                      i === idx ? { ...p, amount: e.target.value } : p,
                    ),
                  )
                }
                placeholder="1"
                className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label={`Ingredient ${idx + 1} amount`}
              />
              <input
                type="text"
                value={ing.unit}
                onChange={(e) =>
                  setIngredients((prev) =>
                    prev.map((p, i) =>
                      i === idx ? { ...p, unit: e.target.value } : p,
                    ),
                  )
                }
                placeholder="cup"
                className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label={`Ingredient ${idx + 1} unit`}
              />
              <input
                type="text"
                value={ing.name}
                onChange={(e) =>
                  setIngredients((prev) =>
                    prev.map((p, i) =>
                      i === idx ? { ...p, name: e.target.value } : p,
                    ),
                  )
                }
                placeholder="flour"
                className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label={`Ingredient ${idx + 1} name`}
              />
              <button
                type="button"
                onClick={() =>
                  setIngredients((prev) =>
                    prev.length === 1
                      ? [{ amount: '', unit: '', name: '' }]
                      : prev.filter((_, i) => i !== idx),
                  )
                }
                className="rounded-md border px-2 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
                aria-label={`Remove ingredient ${idx + 1}`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Steps</label>
          <button
            type="button"
            onClick={() => setSteps((prev) => [...prev, ''])}
            className="text-sm font-medium text-primary hover:underline"
          >
            + Add step
          </button>
        </div>
        <div className="space-y-2">
          {steps.map((step, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span className="mt-2 w-6 shrink-0 text-sm text-muted-foreground">
                {idx + 1}.
              </span>
              <textarea
                value={step}
                onChange={(e) =>
                  setSteps((prev) =>
                    prev.map((p, i) => (i === idx ? e.target.value : p)),
                  )
                }
                rows={2}
                placeholder="Describe this step"
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label={`Step ${idx + 1}`}
              />
              <button
                type="button"
                onClick={() =>
                  setSteps((prev) =>
                    prev.length === 1 ? [''] : prev.filter((_, i) => i !== idx),
                  )
                }
                className="rounded-md border px-2 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
                aria-label={`Remove step ${idx + 1}`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {mutation.isError ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          {mutation.error instanceof Error
            ? mutation.error.message
            : 'Failed to save recipe'}
        </div>
      ) : null}

      {coverUploadError ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          Cover image upload failed: {coverUploadError}
        </div>
      ) : null}

      <div className="flex items-center justify-end gap-3 pt-2">
        <Link
          to="/recipes/$recipeId"
          params={{ recipeId: id }}
          className="inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium transition hover:bg-muted"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={mutation.isPending || isUploadingCover}
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
        >
          {isUploadingCover
            ? 'Uploading image…'
            : mutation.isPending
              ? 'Saving…'
              : 'Save'}
        </button>
      </div>
    </form>
  )
}

function TagInput({
  tags,
  onChange,
}: {
  tags: string[]
  onChange: (next: string[]) => void
}) {
  const [draft, setDraft] = useState('')

  function commit(raw: string) {
    const value = raw.trim().replace(/,$/, '').trim()
    if (!value) return
    if (tags.includes(value)) {
      setDraft('')
      return
    }
    onChange([...tags, value])
    setDraft('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      commit(draft)
      return
    }
    if (e.key === 'Backspace' && draft === '' && tags.length > 0) {
      onChange(tags.slice(0, -1))
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
          >
            {tag}
            <button
              type="button"
              onClick={() => onChange(tags.filter((t) => t !== tag))}
              className="text-muted-foreground transition hover:text-foreground"
              aria-label={`Remove tag ${tag}`}
            >
              ✕
            </button>
          </span>
        ))}
      </div>
      <input
        type="text"
        value={draft}
        onChange={(e) => {
          const v = e.target.value
          if (v.endsWith(',')) {
            commit(v)
          } else {
            setDraft(v)
          }
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => commit(draft)}
        placeholder="Type a tag and press Enter"
        className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  )
}

function EditSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-10 animate-pulse rounded-md bg-muted" />
      <div className="h-20 animate-pulse rounded-md bg-muted" />
      <div className="grid grid-cols-2 gap-4">
        <div className="h-10 animate-pulse rounded-md bg-muted" />
        <div className="h-10 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="h-24 animate-pulse rounded-md bg-muted" />
      <div className="h-40 animate-pulse rounded-md bg-muted" />
    </div>
  )
}

function NotFoundView() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16 text-center">
      <p className="text-lg font-medium text-foreground">Recipe not found</p>
      <p className="text-sm text-muted-foreground">
        It may have been deleted or never existed.
      </p>
      <Link
        to="/"
        className="mt-2 inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
      >
        Back to recipes
      </Link>
    </div>
  )
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-destructive/40 bg-destructive/5 py-16 text-center">
      <p className="text-lg font-medium text-foreground">
        Couldn't load recipe
      </p>
      <p className="text-sm text-muted-foreground">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium transition hover:bg-muted"
      >
        Try again
      </button>
    </div>
  )
}

function parseIntOrNull(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const n = parseInt(trimmed, 10)
  return Number.isNaN(n) ? null : n
}
