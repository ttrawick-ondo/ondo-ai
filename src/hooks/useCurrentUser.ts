'use client'

import { useSession } from 'next-auth/react'

/**
 * Hook to get the current authenticated user from NextAuth session
 * Use this for auth state; use useCurrentUser from stores for user data
 */
export function useAuthSession() {
  const { data: session, status } = useSession()

  return {
    session,
    user: session?.user ?? null,
    userId: session?.user?.id ?? null,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
  }
}

/**
 * Hook to get just the user ID (convenience wrapper)
 */
export function useUserId(): string {
  const { userId, isLoading } = useAuthSession()

  if (isLoading) {
    return ''
  }

  if (!userId) {
    console.warn('useUserId called without authenticated session')
    return ''
  }

  return userId
}
