import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { User, UserPreferences } from '@/types'
import { mockCurrentUser } from '@/lib/mocks/data'

interface UserState {
  currentUser: User | null
  isAuthenticated: boolean
  preferences: UserPreferences
}

interface UserActions {
  setUser: (user: User | null) => void
  updatePreferences: (prefs: Partial<UserPreferences>) => void
  logout: () => void
}

type UserStore = UserState & { actions: UserActions }

const defaultPreferences: UserPreferences = {
  theme: 'system',
  sendWithEnter: true,
  showCodeLineNumbers: true,
}

export const useUserStore = create<UserStore>()(
  devtools(
    persist(
      (set) => ({
        currentUser: mockCurrentUser,
        isAuthenticated: true, // Mock as authenticated
        preferences: defaultPreferences,

        actions: {
          setUser: (user) => {
            set({ currentUser: user, isAuthenticated: !!user })
          },

          updatePreferences: (prefs) => {
            set((state) => ({
              preferences: { ...state.preferences, ...prefs },
            }))
          },

          logout: () => {
            set({
              currentUser: null,
              isAuthenticated: false,
              preferences: defaultPreferences,
            })
          },
        },
      }),
      {
        name: 'user-store',
        partialize: (state) => ({
          preferences: state.preferences,
        }),
      }
    ),
    { name: 'user-store' }
  )
)

// Selector hooks
export const useCurrentUser = () => useUserStore((state) => state.currentUser)
export const useIsAuthenticated = () => useUserStore((state) => state.isAuthenticated)
export const useUserPreferences = () => useUserStore((state) => state.preferences)
export const useUserActions = () => useUserStore.getState().actions
