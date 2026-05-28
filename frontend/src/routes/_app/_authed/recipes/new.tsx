import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { client } from '@/lib/client'
import { recipeInputSchema, type Ingredient } from '@/lib/recipe-schema'
import { uploadCover } from '@/lib/recipe-uploads'
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
  const [isUploadingCover, setIsUploadingCover] = useState(false)
  const [draftRestored, setDraftRestored] = useState(restoredDraft != null)

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
    onSuccess: async (created) => {
      clearDraft()
      if (coverFile) {
        setIsUploadingCover(true)
        try {
          await uploadCover(created.id, coverFile)
        } catch (err) {
          setIsUploadingCover(false)
          setServerError(
            `Recipe saved, but cover image upload failed: ${
              err instanceof Error ? err.message : 'unknown error'
            }. You can retry from the edit page.`,
          )
          queryClient.invalidateQueries({ queryKey: ['recipes'] })
          router.navigate({
            to: '/recipes/$recipeId/edit',
            params: { recipeId: created.id },
          })
          return
        }
        setIsUploadingCover(false)
      }
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
      router.navigate({ to: '/' })
    },
    onError: (err) => {
      setServerError(err instanceof Error ? err.message : 'Something went wrong')
    },
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
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
            disabled={mutation.isPending || isUploadingCover}
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

        <div className="flex items-center justify-end gap-3 border-t pt-6">
          <Link
            to="/"
            className="inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium transition hover:bg-muted"
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
                ? 'Creating…'
                : 'Create recipe'}
          </button>
        </div>
      </form>
    </div>
  )
}
