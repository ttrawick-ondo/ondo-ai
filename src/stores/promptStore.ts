/**
 * Prompt Store
 *
 * Manages UI state for prompts. Data fetching is handled by React Query.
 * This store only persists favorites and UI preferences.
 */

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

interface PromptUIState {
  activeCategoryId: string | null
  searchQuery: string
  favoriteIds: Set<string>
}

interface PromptUIActions {
  setActiveCategory: (id: string | null) => void
  setSearchQuery: (query: string) => void
  toggleFavorite: (id: string) => void
  isFavorite: (id: string) => boolean
}

type PromptStore = PromptUIState & { actions: PromptUIActions }

export const usePromptStore = create<PromptStore>()(
  devtools(
    persist(
      (set, get) => ({
        activeCategoryId: null,
        searchQuery: '',
        favoriteIds: new Set<string>(),

        actions: {
          setActiveCategory: (id) => {
            set({ activeCategoryId: id })
          },

          setSearchQuery: (query) => {
            set({ searchQuery: query })
          },

          toggleFavorite: (id) => {
            set((state) => {
              const newFavorites = new Set(state.favoriteIds)
              if (newFavorites.has(id)) {
                newFavorites.delete(id)
              } else {
                newFavorites.add(id)
              }
              return { favoriteIds: newFavorites }
            })
          },

          isFavorite: (id) => {
            return get().favoriteIds.has(id)
          },
        },
      }),
      {
        name: 'prompt-store',
        partialize: (state) => ({
          favoriteIds: Array.from(state.favoriteIds),
          activeCategoryId: state.activeCategoryId,
        }),
        merge: (persisted, current) => ({
          ...current,
          ...(persisted as Partial<PromptStore>),
          favoriteIds: new Set((persisted as { favoriteIds?: string[] })?.favoriteIds || []),
        }),
      }
    ),
    { name: 'prompt-store' }
  )
)

// ============================================================================
// Selectors
// ============================================================================

export const useActiveCategoryId = () =>
  usePromptStore((state) => state.activeCategoryId)

export const usePromptSearchQuery = () =>
  usePromptStore((state) => state.searchQuery)

export const useFavoriteIds = () =>
  usePromptStore((state) => state.favoriteIds)

export const usePromptUIActions = () =>
  usePromptStore((state) => state.actions)

// Legacy aliases for backwards compatibility
export const usePromptActions = usePromptUIActions
