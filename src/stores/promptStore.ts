import { useMemo } from 'react'
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { Prompt, PromptCategory, CreatePromptInput, UpdatePromptInput } from '@/types'
import { mockPrompts, mockPromptCategories } from '@/lib/mocks/data'
import { generateId } from '@/lib/utils'

interface PromptState {
  prompts: Record<string, Prompt>
  categories: PromptCategory[]
  activeCategoryId: string | null
  searchQuery: string
  isLoading: boolean
}

interface PromptActions {
  setActiveCategory: (id: string | null) => void
  setSearchQuery: (query: string) => void
  createPrompt: (input: CreatePromptInput) => Prompt
  updatePrompt: (id: string, input: UpdatePromptInput) => void
  deletePrompt: (id: string) => void
  duplicatePrompt: (id: string) => Prompt
  toggleFavorite: (id: string) => void
  incrementUsage: (id: string) => void
  loadPrompts: () => void
}

type PromptStore = PromptState & { actions: PromptActions }

// Convert array to record
const promptsRecord = mockPrompts.reduce((acc, prompt) => {
  acc[prompt.id] = prompt
  return acc
}, {} as Record<string, Prompt>)

export const usePromptStore = create<PromptStore>()(
  devtools(
    persist(
      (set, get) => ({
        prompts: promptsRecord,
        categories: mockPromptCategories,
        activeCategoryId: null,
        searchQuery: '',
        isLoading: false,

        actions: {
          setActiveCategory: (id) => {
            set({ activeCategoryId: id })
          },

          setSearchQuery: (query) => {
            set({ searchQuery: query })
          },

          createPrompt: (input) => {
            const id = `prompt-${generateId()}`
            const now = new Date()

            const prompt: Prompt = {
              id,
              title: input.title,
              description: input.description,
              content: input.content,
              variables: input.variables || [],
              categoryId: input.categoryId,
              tags: input.tags || [],
              visibility: input.visibility,
              workspaceId: input.workspaceId,
              userId: 'user-1',
              usageCount: 0,
              isFavorite: false,
              createdAt: now,
              updatedAt: now,
            }

            set((state) => ({
              prompts: { ...state.prompts, [id]: prompt },
              categories: state.categories.map((c) =>
                c.id === input.categoryId
                  ? { ...c, promptCount: c.promptCount + 1 }
                  : c
              ),
            }))

            return prompt
          },

          updatePrompt: (id, input) => {
            const oldPrompt = get().prompts[id]

            set((state) => {
              let categories = state.categories

              // Update category counts if category changed
              if (input.categoryId && input.categoryId !== oldPrompt.categoryId) {
                categories = categories.map((c) => {
                  if (c.id === oldPrompt.categoryId) {
                    return { ...c, promptCount: c.promptCount - 1 }
                  }
                  if (c.id === input.categoryId) {
                    return { ...c, promptCount: c.promptCount + 1 }
                  }
                  return c
                })
              }

              return {
                prompts: {
                  ...state.prompts,
                  [id]: {
                    ...state.prompts[id],
                    ...input,
                    updatedAt: new Date(),
                  },
                },
                categories,
              }
            })
          },

          deletePrompt: (id) => {
            const prompt = get().prompts[id]

            set((state) => {
              const { [id]: _, ...prompts } = state.prompts
              return {
                prompts,
                categories: state.categories.map((c) =>
                  c.id === prompt.categoryId
                    ? { ...c, promptCount: c.promptCount - 1 }
                    : c
                ),
              }
            })
          },

          duplicatePrompt: (id) => {
            const original = get().prompts[id]
            const newId = `prompt-${generateId()}`
            const now = new Date()

            const duplicate: Prompt = {
              ...original,
              id: newId,
              title: `${original.title} (Copy)`,
              usageCount: 0,
              isFavorite: false,
              createdAt: now,
              updatedAt: now,
            }

            set((state) => ({
              prompts: { ...state.prompts, [newId]: duplicate },
              categories: state.categories.map((c) =>
                c.id === original.categoryId
                  ? { ...c, promptCount: c.promptCount + 1 }
                  : c
              ),
            }))

            return duplicate
          },

          toggleFavorite: (id) => {
            set((state) => ({
              prompts: {
                ...state.prompts,
                [id]: {
                  ...state.prompts[id],
                  isFavorite: !state.prompts[id].isFavorite,
                },
              },
            }))
          },

          incrementUsage: (id) => {
            set((state) => ({
              prompts: {
                ...state.prompts,
                [id]: {
                  ...state.prompts[id],
                  usageCount: state.prompts[id].usageCount + 1,
                },
              },
            }))
          },

          loadPrompts: () => {
            set({ isLoading: true })
            setTimeout(() => {
              set({ isLoading: false })
            }, 500)
          },
        },
      }),
      {
        name: 'prompt-store',
        partialize: (state) => ({
          // Only persist favorites
          prompts: Object.fromEntries(
            Object.entries(state.prompts).filter(([_, p]) => p.isFavorite)
          ),
        }),
      }
    ),
    { name: 'prompt-store' }
  )
)

// Selector hooks
export const usePrompts = (): Prompt[] => {
  const prompts = usePromptStore((state) => state.prompts)
  return useMemo(() => Object.values(prompts), [prompts])
}

export const usePromptById = (id: string) =>
  usePromptStore((state) => state.prompts[id])

export const usePromptCategories = () =>
  usePromptStore((state) => state.categories)

export const useFavoritePrompts = (): Prompt[] => {
  const prompts = usePromptStore((state) => state.prompts)
  return useMemo(
    () => Object.values(prompts).filter((p) => p.isFavorite),
    [prompts]
  )
}

export const useFilteredPrompts = (): Prompt[] => {
  const prompts = usePromptStore((state) => state.prompts)
  const activeCategoryId = usePromptStore((state) => state.activeCategoryId)
  const searchQuery = usePromptStore((state) => state.searchQuery)

  return useMemo(() => {
    let result = Object.values(prompts)

    if (activeCategoryId) {
      result = result.filter((p) => p.categoryId === activeCategoryId)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query) ||
          p.tags.some((t) => t.toLowerCase().includes(query))
      )
    }

    return result
  }, [prompts, activeCategoryId, searchQuery])
}

export const usePromptActions = () => usePromptStore.getState().actions
