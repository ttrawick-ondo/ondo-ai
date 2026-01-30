import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { User, UserPreferences } from '@/types'
import { mockCurrentUser } from '@/lib/mocks/data'

interface UserState {
  currentUser: User | null
  isAuthenticated: boolean
  preferences: UserPreferences
}

interface UpdateProfileInput {
  name: string
  email: string
  avatarUrl?: string
}

interface UserActions {
  setUser: (user: User | null) => void
  updatePreferences: (prefs: Partial<UserPreferences>) => void
  updateProfile: (input: UpdateProfileInput) => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
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

          updateProfile: async (input) => {
            // TODO: In production, this would call an API endpoint
            // For now, we just update the local state
            set((state) => ({
              currentUser: state.currentUser
                ? {
                    ...state.currentUser,
                    name: input.name,
                    email: input.email,
                    avatarUrl: input.avatarUrl,
                  }
                : null,
            }))

            // Simulate API call
            await new Promise((resolve) => setTimeout(resolve, 500))
          },

          changePassword: async (_currentPassword, _newPassword) => {
            // TODO: In production, this would call an API endpoint
            // For now, we just simulate the password change
            // Simulate API call
            await new Promise((resolve) => setTimeout(resolve, 500))

            // In a real implementation:
            // 1. Validate current password
            // 2. Hash and store new password
            // 3. Invalidate other sessions if desired
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
