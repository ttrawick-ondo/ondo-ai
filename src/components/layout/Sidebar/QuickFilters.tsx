'use client'

import { Calendar, Clock, Archive, Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export type QuickFilter = 'all' | 'today' | 'week' | 'archived'

interface QuickFiltersProps {
  activeFilter: QuickFilter
  onFilterChange: (filter: QuickFilter) => void
  className?: string
}

const filters: Array<{
  id: QuickFilter
  label: string
  icon: React.ComponentType<{ className?: string }>
}> = [
  { id: 'all', label: 'All', icon: Inbox },
  { id: 'today', label: 'Today', icon: Clock },
  { id: 'week', label: 'This Week', icon: Calendar },
  { id: 'archived', label: 'Archived', icon: Archive },
]

export function QuickFilters({
  activeFilter,
  onFilterChange,
  className,
}: QuickFiltersProps) {
  return (
    <div className={cn('flex items-center gap-1 p-1 overflow-x-auto', className)}>
      {filters.map(({ id, label, icon: Icon }) => (
        <Button
          key={id}
          variant={activeFilter === id ? 'secondary' : 'ghost'}
          size="sm"
          className={cn(
            'h-7 px-2.5 text-xs font-medium shrink-0',
            activeFilter === id
              ? 'text-secondary-foreground'
              : 'text-muted-foreground'
          )}
          onClick={() => onFilterChange(id)}
        >
          <Icon className="h-3.5 w-3.5 mr-1.5" />
          {label}
        </Button>
      ))}
    </div>
  )
}

// Helper function to filter conversations by quick filter
export function filterConversationsByQuickFilter<
  T extends { lastMessageAt: Date; archived?: boolean }
>(conversations: T[], filter: QuickFilter): T[] {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfWeek = new Date(startOfToday)
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())

  switch (filter) {
    case 'today':
      return conversations.filter(
        (c) => !c.archived && new Date(c.lastMessageAt) >= startOfToday
      )
    case 'week':
      return conversations.filter(
        (c) => !c.archived && new Date(c.lastMessageAt) >= startOfWeek
      )
    case 'archived':
      return conversations.filter((c) => c.archived)
    case 'all':
    default:
      return conversations.filter((c) => !c.archived)
  }
}
