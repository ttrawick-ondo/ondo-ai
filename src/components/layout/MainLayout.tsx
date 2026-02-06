'use client'

import { useEffect } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { AlertTriangle } from 'lucide-react'
import { useChatActions, useProjectActions } from '@/stores'

interface MainLayoutProps {
  children: React.ReactNode
}

function SidebarErrorFallback() {
  return (
    <div className="w-64 border-r bg-muted/50 flex flex-col items-center justify-center p-4 text-center">
      <AlertTriangle className="h-8 w-8 text-destructive mb-2" />
      <p className="text-sm text-muted-foreground">
        Sidebar failed to load.
        <br />
        <button
          onClick={() => window.location.reload()}
          className="text-primary underline mt-1"
        >
          Reload page
        </button>
      </p>
    </div>
  )
}

function ContentErrorFallback() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
      <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
      <p className="text-muted-foreground mb-4">
        The page content failed to load.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
      >
        Reload page
      </button>
    </div>
  )
}

export function MainLayout({ children }: MainLayoutProps) {
  const { fetchUserConversations } = useChatActions()
  const { fetchUserProjects } = useProjectActions()

  // Fetch data on mount
  useEffect(() => {
    const userId = 'user-1' // TODO: Get from auth context
    const workspaceId = 'default' // TODO: Get from auth context

    // Fetch all data in parallel
    Promise.all([
      fetchUserConversations(userId),
      fetchUserProjects(userId, workspaceId),
    ]).catch((error) => {
      console.error('Error loading initial data:', error)
    })
  }, [fetchUserConversations, fetchUserProjects])

  return (
    <div className="flex h-screen overflow-hidden">
      <ErrorBoundary fallback={<SidebarErrorFallback />}>
        <Sidebar />
      </ErrorBoundary>
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <ErrorBoundary fallback={<ContentErrorFallback />}>
          <main className="flex-1 overflow-auto">{children}</main>
        </ErrorBoundary>
      </div>
    </div>
  )
}
