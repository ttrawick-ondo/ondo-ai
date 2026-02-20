'use client'

import { useState } from 'react'
import { GitBranch, MessageSquare, Plus, X } from 'lucide-react'
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
  onDeleteBranch?: (branchId: string) => void
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
  onClose?: () => void
  icon: React.ReactNode
  label: string
  tooltipText: string
}

function TabButton({ isActive, onClick, onClose, icon, label, tooltipText }: TabButtonProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onClick}
            className={cn(
              'group/tab flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium border-b-2 transition-all',
              isActive
                ? 'border-blue-600 text-blue-600 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800'
            )}
          >
            {icon}
            <span>{label}</span>
            {onClose && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation()
                  onClose()
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.stopPropagation(); onClose() }
                }}
                className="ml-1 rounded-sm p-0.5 opacity-0 group-hover/tab:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 transition-opacity"
              >
                <X className="h-3 w-3" />
              </span>
            )}
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
  onDeleteBranch,
  onCreateBranch,
  className,
}: BranchTabsProps) {
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)

  const handleCloseBranch = (branchId: string) => {
    if (confirmingDeleteId === branchId) {
      // Second click — confirm delete
      onDeleteBranch?.(branchId)
      setConfirmingDeleteId(null)
      if (activeBranchId === branchId) {
        onBranchSelect(null)
      }
    } else {
      // First click — show confirmation
      setConfirmingDeleteId(branchId)
      // Auto-reset after 3 seconds
      setTimeout(() => setConfirmingDeleteId((prev) => prev === branchId ? null : prev), 3000)
    }
  }

  return (
    <div className={cn('flex items-center gap-0.5 px-3 border-b bg-muted/30', className)}>
      {/* Main conversation tab */}
      <TabButton
        isActive={activeBranchId === null}
        onClick={() => onBranchSelect(null)}
        icon={<MessageSquare className="h-3 w-3" />}
        label={truncateTitle(mainTitle)}
        tooltipText={`Main conversation: ${mainTitle}`}
      />

      {/* Branch tabs */}
      {branches.map((branch) => (
        <TabButton
          key={branch.id}
          isActive={activeBranchId === branch.id}
          onClick={() => onBranchSelect(branch.id)}
          onClose={onDeleteBranch ? () => handleCloseBranch(branch.id) : undefined}
          icon={<GitBranch className="h-3 w-3" />}
          label={confirmingDeleteId === branch.id ? 'Delete?' : truncateTitle(branch.title)}
          tooltipText={confirmingDeleteId === branch.id ? 'Click again to delete' : branch.title}
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
                className="h-6 w-6 ml-1"
                onClick={onCreateBranch}
              >
                <Plus className="h-3 w-3" />
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
