import { useMutation, useQueryClient } from '@tanstack/react-query'
import { uploadCover } from '@/lib/recipe-uploads'

export function useCoverUpload() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ recipeId, file }: { recipeId: string; file: File }) =>
      uploadCover(recipeId, file),
    onSuccess: (_data, { recipeId }) => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
      queryClient.invalidateQueries({ queryKey: ['recipe', recipeId] })
    },
  })
}
