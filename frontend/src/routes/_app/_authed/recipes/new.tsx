import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { client } from '@/lib/client'
import { recipeInputSchema, type Ingredient } from '@/lib/recipe-schema'
import { useCoverUpload } from '@/hooks/useCoverUpload'
import { useToast } from '@/components/ui/Toast'
import { Button, buttonClassName } from '@/components/ui/Button'
import { TagInput } from '@/components/TagInput'
import { IngredientBuilder } from '@/components/IngredientBuilder'
import { StepBuilder } from '@/components/StepBuilder'
import { CoverImageInput } from '@/components/CoverImageInput'
import { AutosaveIndicator } from '@/components/AutosaveIndicator'
import { loadDraft, useAutosaveDraft } from '@/hooks/useAutosaveDraft'

export const Route = createFileRoute('/_app/_authed/recipes/new')({
  component: NewRecipePage,
})

const RECIPE_DRAFT_KEY = 'recipe-box:new-recipe-draft'

type RecipeDraft = {
  title: string
  description: string
  cookTime: string
  servings: string
  tags: string[]
  ingredients: Ingredient[]
  steps: string[]
}

type IngredientErrors = Partial<Record<keyof Ingredient, string | undefined>>

type FieldErrors = {
  title?: string
  cookTimeMinutes?: string
  servings?: string
  ingredients?: Array<IngredientErrors | undefined>
  steps?: Array<string | undefined>
}

const EMPTY_INGREDIENT: Ingredient = { amount: '', unit: '', name: '' }

function isEmptyIngredient(ing: Ingredient): boolean {
  return !ing.amount.trim() && !ing.unit.trim() && !ing.name.trim()
}

function NewRecipePage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const [restoredDraft] = useState(() => loadDraft<RecipeDraft>(RECIPE_DRAFT_KEY))

  const [title, setTitle] = useState(restoredDraft?.title ?? '')
  const [description, setDescription] = useState(restoredDraft?.description ?? '')
  const [cookTime, setCookTime] = useState(restoredDraft?.cookTime ?? '')
  const [servings, setServings] = useState(restoredDraft?.servings ?? '')
  const [tags, setTags] = useState<string[]>(restoredDraft?.tags ?? [])
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    restoredDraft?.ingredients ?? [EMPTY_INGREDIENT],
  )
  const [steps, setSteps] = useState<string[]>(restoredDraft?.steps ?? [''])
  const [errors, setErrors] = useState<FieldErrors>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverError, setCoverError] = useState<string | null>(null)
  const [createdId, setCreatedId] = useState<string | null>(null)
  const [draftRestored, setDraftRestored] = useState(restoredDraft != null)

  const { toast } = useToast()
  const coverUpload = useCoverUpload()

  function runCoverUpload(recipeId: string, file: File) {
    coverUpload.mutate(
      { recipeId, file },
      {
        onSuccess: () => router.navigate({ to: '/' }),
        onError: (err) => {
          toast({
            title: 'Cover image upload failed',
            description:
              err instanceof Error ? err.message : 'Please try again.',
            action: {
              label: 'Retry',
              onClick: () => runCoverUpload(recipeId, file),
            },
          })
        },
      },
    )
  }

  const draft: RecipeDraft = { title, description, cookTime, servings, tags, ingredients, steps }
  const hasContent =
    title.trim() !== '' ||
    description.trim() !== '' ||
    cookTime !== '' ||
    servings !== '' ||
    tags.length > 0 ||
    ingredients.some((ing) => !isEmptyIngredient(ing)) ||
    steps.some((s) => s.trim() !== '')

  const { status: draftStatus, clearDraft } = useAutosaveDraft(RECIPE_DRAFT_KEY, draft, {
    delay: 1000,
    enabled: hasContent,
  })

  function discardDraft() {
    clearDraft()
    setTitle('')
    setDescription('')
    setCookTime('')
    setServings('')
    setTags([])
    setIngredients([EMPTY_INGREDIENT])
    setSteps([''])
    setErrors({})
    setDraftRestored(false)
  }

  function clearError(key: keyof FieldErrors) {
    setErrors((prev) => (prev[key] == null ? prev : { ...prev, [key]: undefined }))
  }

  const mutation = useMutation({
    mutationFn: async (input: {
      title: string
      description: string | null
      cookTimeMinutes: number | null
      servings: number | null
      ingredients: Ingredient[]
      steps: string[]
      tags: string[]
    }) => {
      const res = await client.api.recipes.$post({ json: input })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error ?? 'Failed to create recipe')
      }
      return res.json()
    },
    onSuccess: (created) => {
      clearDraft()
      setCreatedId(created.id)
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
      if (coverFile) {
        runCoverUpload(created.id, coverFile)
      } else {
        router.navigate({ to: '/' })
      }
    },
    onError: (err) => {
      setServerError(err instanceof Error ? err.message : 'Something went wrong')
    },
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (createdId) return
    setServerError(null)

    const trimmedIngredients = ingredients.map((ing) => ({
      amount: ing.amount.trim(),
      unit: ing.unit.trim(),
      name: ing.name.trim(),
    }))
    const payloadIdxToDisplayIdx: number[] = []
    const payloadIngredients = trimmedIngredients.filter((ing, idx) => {
      if (isEmptyIngredient(ing)) return false
      payloadIdxToDisplayIdx.push(idx)
      return true
    })

    const trimmedSteps = steps.map((s) => s.trim())
    const stepIdxToDisplayIdx: number[] = []
    const payloadSteps = trimmedSteps.filter((s, idx) => {
      if (!s) return false
      stepIdxToDisplayIdx.push(idx)
      return true
    })

    const cookTimeNum = cookTime.trim() === '' ? null : Number(cookTime)
    const servingsNum = servings.trim() === '' ? null : Number(servings)

    const candidate = {
      title: title.trim(),
      description: description.trim() === '' ? null : description.trim(),
      cookTimeMinutes: cookTimeNum,
      servings: servingsNum,
      ingredients: payloadIngredients,
      steps: payloadSteps,
      tags,
    }

    const parsed = recipeInputSchema.safeParse(candidate)
    if (!parsed.success) {
      const f = parsed.error.format()

      const ingredientErrors: Array<IngredientErrors | undefined> = new Array(ingredients.length).fill(undefined)
      payloadIdxToDisplayIdx.forEach((displayIdx, payloadIdx) => {
        const item = f.ingredients?.[payloadIdx]
        if (!item) return
        ingredientErrors[displayIdx] = {
          amount: item.amount?._errors[0],
          unit: item.unit?._errors[0],
          name: item.name?._errors[0],
        }
      })

      const stepErrors: Array<string | undefined> = new Array(steps.length).fill(undefined)
      stepIdxToDisplayIdx.forEach((displayIdx, payloadIdx) => {
        stepErrors[displayIdx] = f.steps?.[payloadIdx]?._errors[0]
      })

      setErrors({
        title: f.title?._errors[0],
        cookTimeMinutes: f.cookTimeMinutes?._errors[0],
        servings: f.servings?._errors[0],
        ingredients: ingredientErrors,
        steps: stepErrors,
      })
      return
    }

    setErrors({})
    mutation.mutate(parsed.data)
  }

  const inputClass =
    'w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

  return (
    <div className="mx-auto w-full max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-8">
        <header className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">New recipe</h1>
          <AutosaveIndicator status={draftStatus} />
        </header>

        {draftRestored ? (
          <div className="flex items-center justify-between gap-4 rounded-md border bg-muted px-3 py-2 text-sm">
            <span className="text-muted-foreground">Draft restored from your last session.</span>
            <button
              type="button"
              onClick={discardDraft}
              className="shrink-0 rounded-md border px-2 py-1 text-xs font-medium transition hover:bg-background"
            >
              Discard
            </button>
          </div>
        ) : null}

        {serverError ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {serverError}
          </div>
        ) : null}

        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Basics</h2>

          <div className="space-y-1">
            <label htmlFor="title" className="text-sm font-medium">Title</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                clearError('title')
              }}
              placeholder="Banana bread"
              className={inputClass}
            />
            {errors.title ? <p className="text-xs text-destructive">{errors.title}</p> : null}
          </div>

          <div className="space-y-1">
            <label htmlFor="description" className="text-sm font-medium">Description</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="A short summary…"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="cookTime" className="text-sm font-medium">Cook time (minutes)</label>
              <input
                id="cookTime"
                type="number"
                inputMode="numeric"
                min={1}
                value={cookTime}
                onChange={(e) => {
                  setCookTime(e.target.value)
                  clearError('cookTimeMinutes')
                }}
                placeholder="45"
                className={inputClass}
              />
              {errors.cookTimeMinutes ? <p className="text-xs text-destructive">{errors.cookTimeMinutes}</p> : null}
            </div>
            <div className="space-y-1">
              <label htmlFor="servings" className="text-sm font-medium">Servings</label>
              <input
                id="servings"
                type="number"
                inputMode="numeric"
                min={1}
                value={servings}
                onChange={(e) => {
                  setServings(e.target.value)
                  clearError('servings')
                }}
                placeholder="4"
                className={inputClass}
              />
              {errors.servings ? <p className="text-xs text-destructive">{errors.servings}</p> : null}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Tags</label>
            <TagInput value={tags} onChange={setTags} placeholder="dessert, quick, vegetarian…" />
          </div>

          <CoverImageInput
            existingUrl={null}
            file={coverFile}
            onFileChange={setCoverFile}
            error={coverError}
            onError={setCoverError}
            disabled={mutation.isPending || coverUpload.isPending || createdId != null}
          />
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Ingredients</h2>
          <IngredientBuilder
            value={ingredients}
            onChange={(next) => {
              setIngredients(next)
              clearError('ingredients')
            }}
            errors={errors.ingredients}
          />
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Steps</h2>
          <StepBuilder
            value={steps}
            onChange={(next) => {
              setSteps(next)
              clearError('steps')
            }}
            errors={errors.steps}
          />
        </section>

        {coverUpload.isError && createdId ? (
          <div
            role="alert"
            className="space-y-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
          >
            <p>
              Your recipe was saved, but the cover image upload failed
              {coverUpload.error instanceof Error
                ? `: ${coverUpload.error.message}`
                : '.'}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => coverFile && runCoverUpload(createdId, coverFile)}
              >
                Retry upload
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.navigate({ to: '/' })}
              >
                Continue without image
              </Button>
            </div>
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-3 border-t pt-6">
          <Link to="/" className={buttonClassName({ variant: 'outline' })}>
            Cancel
          </Link>
          <Button
            type="submit"
            loading={mutation.isPending || coverUpload.isPending}
            disabled={createdId != null}
          >
            {coverUpload.isPending
              ? 'Uploading image…'
              : mutation.isPending
                ? 'Creating…'
                : 'Create recipe'}
          </Button>
        </div>
      </form>
    </div>
  )
}
