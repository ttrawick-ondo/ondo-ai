'use client'

import { GitBranch, MessageSquare, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { Conversation } from '@/types'

interface BranchTabsProps {
  mainConversationId: string
  mainTitle: string
  branches: Conversation[]
  activeBranchId: string | null // null = main conversation
  onBranchSelect: (branchId: string | null) => void
  onCreateBranch?: () => void
  className?: string
}

function truncateTitle(title: string, maxLength = 20): string {
  if (title.length <= maxLength) return title
  return title.slice(0, maxLength - 1) + '…'
}

interface TabButtonProps {
  isActive: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  tooltipText: string
}

function TabButton({ isActive, onClick, icon, label, tooltipText }: TabButtonProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onClick}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-all',
              isActive
                ? 'border-blue-600 text-blue-600 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800'
            )}
          >
            {icon}
            <span>{label}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export function BranchTabs({
  mainConversationId,
  mainTitle,
  branches,
  activeBranchId,
  onBranchSelect,
  onCreateBranch,
  className,
}: BranchTabsProps) {
  return (
    <div className={cn('flex items-center gap-1 px-4 border-b bg-muted/30', className)}>
      {/* Main conversation tab */}
      <TabButton
        isActive={activeBranchId === null}
        onClick={() => onBranchSelect(null)}
        icon={<MessageSquare className="h-4 w-4" />}
        label={truncateTitle(mainTitle)}
        tooltipText={`Main conversation: ${mainTitle}`}
      />

      {/* Branch tabs */}
      {branches.map((branch) => (
        <TabButton
          key={branch.id}
          isActive={activeBranchId === branch.id}
          onClick={() => onBranchSelect(branch.id)}
          icon={<GitBranch className="h-4 w-4" />}
          label={truncateTitle(branch.title)}
          tooltipText={branch.title}
        />
      ))}

      {/* Optional create branch button */}
      {onCreateBranch && (
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 ml-1"
                onClick={onCreateBranch}
              >
                <Plus className="h-4 w-4" />
                <span className="sr-only">Create branch</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Branch from last message</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  )
}
