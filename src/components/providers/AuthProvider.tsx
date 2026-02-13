'use client'

import { useEffect } from 'react'
import { SessionProvider, useSession } from 'next-auth/react'
import type { Session } from 'next-auth'
import { useUserStore } from '@/stores/userStore'

interface AuthProviderProps {
  children: React.ReactNode
  session?: Session | null
}

// Inner component that syncs session to user store
function AuthSync({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const setUser = useUserStore((state) => state.actions.setUser)

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      const now = new Date()
      setUser({
        id: session.user.id,
        name: session.user.name || 'User',
        email: session.user.email || '',
        avatarUrl: session.user.image || undefined,
        createdAt: now,
        updatedAt: now,
      })
    } else if (status === 'unauthenticated') {
      setUser(null)
    }
  }, [session, status, setUser])

  return <>{children}</>
}

export function AuthProvider({ children, session }: AuthProviderProps) {
  return (
    <SessionProvider session={session}>
      <AuthSync>{children}</AuthSync>
    </SessionProvider>
  )
}
