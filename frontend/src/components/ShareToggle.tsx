import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { client } from '@/lib/client'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import type { Recipe } from '@/lib/recipe-queries'

type ShareToggleProps = {
  recipe: Recipe
}

type ShareResponse = { isPublic: boolean; publicSlug: string }

export function ShareToggle({ recipe }: ShareToggleProps) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const queryKey = ['recipe', recipe.id] as const

  const mutation = useMutation({
    mutationFn: async (): Promise<ShareResponse> => {
      const res = await client.api.recipes[':id'].share.$post({
        param: { id: recipe.id },
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null
        throw new Error(body?.error ?? 'Failed to update sharing')
      }
      return (await res.json()) as ShareResponse
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<Recipe>(queryKey)
      if (previous) {
        queryClient.setQueryData<Recipe>(queryKey, {
          ...previous,
          isPublic: !previous.isPublic,
        })
      }
      return { previous }
    },
    onError: (err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData<Recipe>(queryKey, context.previous)
      }
      toast({
        title: 'Failed to update sharing',
        description: err instanceof Error ? err.message : 'Please try again.',
        action: { label: 'Retry', onClick: () => mutation.mutate() },
      })
    },
    onSuccess: (data) => {
      const current = queryClient.getQueryData<Recipe>(queryKey)
      if (current) {
        queryClient.setQueryData<Recipe>(queryKey, {
          ...current,
          isPublic: data.isPublic,
          publicSlug: data.publicSlug,
        })
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
    },
  })

  const isPublic = recipe.isPublic
  const publicUrl =
    isPublic && recipe.publicSlug
      ? `${window.location.origin}/r/${recipe.publicSlug}`
      : null

  return (
    <section className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold">Public sharing</h2>
          <p className="text-sm text-muted-foreground">
            {isPublic
              ? 'Anyone with the link can view this recipe.'
              : 'Only you can view this recipe.'}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={isPublic}
          aria-label="Toggle public sharing"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border transition disabled:opacity-50 ${
            isPublic
              ? 'border-primary bg-primary'
              : 'border-input bg-muted'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-background shadow transition ${
              isPublic ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {publicUrl ? <CopyableUrl url={publicUrl} /> : null}
    </section>
  )
}

function CopyableUrl({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        readOnly
        value={url}
        onFocus={(e) => e.currentTarget.select()}
        aria-label="Public recipe URL"
        className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <Button
        variant="outline"
        onClick={handleCopy}
        className="shrink-0"
      >
        {copied ? 'Copied' : 'Copy'}
      </Button>
    </div>
  )
}
