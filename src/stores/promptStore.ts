import { useMemo } from 'react'
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { toast } from 'sonner'
import type { Prompt, PromptCategory, CreatePromptInput, UpdatePromptInput } from '@/types'
import { promptApi } from '@/lib/api/client/prompts'

interface PromptState {
  prompts: Record<string, Prompt>
  categories: PromptCategory[]
  activeCategoryId: string | null
  searchQuery: string
  isLoading: boolean
  isSyncing: boolean
  isInitialized: boolean
  // Local favorites (not stored in DB)
  favoriteIds: Set<string>
}

interface PromptActions {
  setActiveCategory: (id: string | null) => void
  setSearchQuery: (query: string) => void
  createPrompt: (input: CreatePromptInput) => Promise<Prompt>
  updatePrompt: (id: string, input: UpdatePromptInput) => Promise<void>
  deletePrompt: (id: string) => Promise<void>
  duplicatePrompt: (id: string, userId?: string) => Promise<Prompt>
  toggleFavorite: (id: string) => void
  incrementUsage: (id: string) => Promise<void>
  loadPrompts: (userId: string, workspaceId?: string) => Promise<void>
  loadCategories: (workspaceId?: string) => Promise<void>
  searchPrompts: (query: string, options?: { workspaceId?: string }) => Promise<void>
}

type PromptStore = PromptState & { actions: PromptActions }

export const usePromptStore = create<PromptStore>()(
  devtools(
    persist(
      (set, get) => ({
        prompts: {},
        categories: [],
        activeCategoryId: null,
        searchQuery: '',
        isLoading: false,
        isSyncing: false,
        isInitialized: false,
        favoriteIds: new Set<string>(),

        actions: {
          setActiveCategory: (id) => {
            set({ activeCategoryId: id })
          },

          setSearchQuery: (query) => {
            set({ searchQuery: query })
          },

          createPrompt: async (input) => {
            set({ isSyncing: true })

            try {
              const prompt = await promptApi.createPrompt({
                userId: input.userId || 'user-1', // TODO: Get from auth
                workspaceId: input.workspaceId,
                name: input.title,
                description: input.description,
                content: input.content,
                variables: input.variables,
                category: input.categoryId,
                tags: input.tags,
                isPublic: input.visibility === 'public',
              })

              set((state) => ({
                prompts: { ...state.prompts, [prompt.id]: prompt },
                isSyncing: false,
              }))

              // Reload categories to update counts
              get().actions.loadCategories(input.workspaceId)

              return prompt
            } catch (error) {
              set({ isSyncing: false })
              const message = error instanceof Error ? error.message : 'Failed to create prompt'
              toast.error(message)
              throw error
            }
          },

          updatePrompt: async (id, input) => {
            const existing = get().prompts[id]
            if (!existing) return

            // Optimistic update
            set((state) => ({
              prompts: {
                ...state.prompts,
                [id]: { ...existing, ...input, updatedAt: new Date() },
              },
              isSyncing: true,
            }))

            try {
              await promptApi.updatePrompt(id, {
                name: input.title,
                description: input.description,
                content: input.content,
                variables: input.variables,
                category: input.categoryId,
                tags: input.tags,
                isPublic: input.visibility === 'public',
              })
              set({ isSyncing: false })

              // Reload categories if category changed
              if (input.categoryId && input.categoryId !== existing.categoryId) {
                get().actions.loadCategories(existing.workspaceId)
              }
            } catch (error) {
              // Rollback
              set((state) => ({
                prompts: { ...state.prompts, [id]: existing },
                isSyncing: false,
              }))
              const message = error instanceof Error ? error.message : 'Failed to update prompt'
              toast.error(message)
              throw error
            }
          },

          deletePrompt: async (id) => {
            const existing = get().prompts[id]
            if (!existing) return

            // Optimistic delete
            set((state) => {
              const { [id]: _, ...prompts } = state.prompts
              return { prompts, isSyncing: true }
            })

            try {
              await promptApi.deletePrompt(id)
              set({ isSyncing: false })

              // Reload categories to update counts
              get().actions.loadCategories(existing.workspaceId)
            } catch (error) {
              // Rollback
              set((state) => ({
                prompts: { ...state.prompts, [id]: existing },
                isSyncing: false,
              }))
              const message = error instanceof Error ? error.message : 'Failed to delete prompt'
              toast.error(message)
              throw error
            }
          },

          duplicatePrompt: async (id, userId = 'user-1') => {
            set({ isSyncing: true })

            try {
              // TODO: Get userId from auth when available
              const duplicate = await promptApi.duplicatePrompt(id, userId)

              set((state) => ({
                prompts: { ...state.prompts, [duplicate.id]: duplicate },
                isSyncing: false,
              }))

              return duplicate
            } catch (error) {
              set({ isSyncing: false })
              const message = error instanceof Error ? error.message : 'Failed to duplicate prompt'
              toast.error(message)
              throw error
            }
          },

          toggleFavorite: (id) => {
            // Favorites are stored locally only
            set((state) => {
              const newFavorites = new Set(state.favoriteIds)
              if (newFavorites.has(id)) {
                newFavorites.delete(id)
              } else {
                newFavorites.add(id)
              }
              return {
                favoriteIds: newFavorites,
                prompts: {
                  ...state.prompts,
                  [id]: {
                    ...state.prompts[id],
                    isFavorite: newFavorites.has(id),
                  },
                },
              }
            })
          },

          incrementUsage: async (id) => {
            // Optimistic update
            set((state) => ({
              prompts: {
                ...state.prompts,
                [id]: {
                  ...state.prompts[id],
                  usageCount: state.prompts[id].usageCount + 1,
                },
              },
            }))

            try {
              await promptApi.incrementUsage(id)
            } catch (error) {
              // Revert on failure
              set((state) => ({
                prompts: {
                  ...state.prompts,
                  [id]: {
                    ...state.prompts[id],
                    usageCount: state.prompts[id].usageCount - 1,
                  },
                },
              }))
              console.error('Failed to increment usage:', error)
            }
          },

          loadPrompts: async (userId, workspaceId) => {
            set({ isLoading: true })

            try {
              const prompts = workspaceId
                ? await promptApi.getWorkspacePrompts(workspaceId, { includePublic: true })
                : await promptApi.getUserPrompts(userId)

              const favoriteIds = get().favoriteIds
              const promptsRecord = prompts.reduce((acc, p) => {
                acc[p.id] = { ...p, isFavorite: favoriteIds.has(p.id) }
                return acc
              }, {} as Record<string, Prompt>)

              set({
                prompts: promptsRecord,
                isLoading: false,
                isInitialized: true,
              })
            } catch (error) {
              set({ isLoading: false })
              const message = error instanceof Error ? error.message : 'Failed to load prompts'
              toast.error(message)
            }
          },

          loadCategories: async (workspaceId) => {
            try {
              const categories = await promptApi.getCategories(workspaceId)
              set({ categories })
            } catch (error) {
              console.error('Failed to load categories:', error)
            }
          },

          searchPrompts: async (query, options) => {
            set({ isLoading: true, searchQuery: query })

            try {
              const prompts = await promptApi.searchPrompts(query, {
                workspaceId: options?.workspaceId,
                includePublic: true,
              })

              const favoriteIds = get().favoriteIds
              const promptsRecord = prompts.reduce((acc, p) => {
                acc[p.id] = { ...p, isFavorite: favoriteIds.has(p.id) }
                return acc
              }, {} as Record<string, Prompt>)

              set({
                prompts: promptsRecord,
                isLoading: false,
              })
            } catch (error) {
              set({ isLoading: false })
              const message = error instanceof Error ? error.message : 'Failed to search prompts'
              toast.error(message)
            }
          },
        },
      }),
      {
        name: 'prompt-store',
        partialize: (state) => ({
          // Only persist favorite IDs and active category
          favoriteIds: Array.from(state.favoriteIds),
          activeCategoryId: state.activeCategoryId,
        }),
        merge: (persisted, current) => ({
          ...current,
          ...(persisted as Partial<PromptStore>),
          // Convert array back to Set
          favoriteIds: new Set((persisted as { favoriteIds?: string[] })?.favoriteIds || []),
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
