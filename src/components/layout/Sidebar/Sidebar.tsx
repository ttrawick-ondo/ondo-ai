'use client'

import { useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useSidebarOpen, useSidebarWidth, useUIActions } from '@/stores'
import { SidebarHeader } from './SidebarHeader'
import { WorkspaceSelector } from './WorkspaceSelector'
import { SidebarNav } from './SidebarNav'
import { ConversationList } from './ConversationList'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

export function Sidebar() {
  const isOpen = useSidebarOpen()
  const width = useSidebarWidth()
  const { setSidebarOpen } = useUIActions()

  // Handle keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'b' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setSidebarOpen(!isOpen)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, setSidebarOpen])

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r bg-muted/30 transition-all duration-300',
        isOpen ? 'w-[280px]' : 'w-0 overflow-hidden border-r-0'
      )}
      style={isOpen ? { width: `${width}px` } : undefined}
    >
      <SidebarHeader />
      <WorkspaceSelector />
      <Separator />
      <SidebarNav />
      <Separator />
      <ScrollArea className="flex-1">
        <ConversationList />
      </ScrollArea>
    </aside>
  )
}
