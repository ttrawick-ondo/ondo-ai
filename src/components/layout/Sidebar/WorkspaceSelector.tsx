'use client'

import { useState } from 'react'
import { Check, ChevronsUpDown, Building2, Plus, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useActiveWorkspaceId, useWorkspaceUIActions, useUIActions } from '@/stores'
import { useWorkspaces, useWorkspace, useWorkspaceMembers } from '@/lib/queries'
import { WorkspaceSettingsDialog } from '@/components/workspace'
import { useAuthSession } from '@/hooks/useCurrentUser'
import type { WorkspaceRole } from '@/types'

export function WorkspaceSelector() {
  const { userId: currentUserId } = useAuthSession()
  const { data: workspaces = [] } = useWorkspaces(currentUserId || '')
  const activeWorkspaceId = useActiveWorkspaceId()
  const { data: activeWorkspace } = useWorkspace(activeWorkspaceId)
  const { data: members } = useWorkspaceMembers(activeWorkspaceId)
  const { setActiveWorkspace } = useWorkspaceUIActions()
  const { openModal } = useUIActions()

  const [showSettings, setShowSettings] = useState(false)

  // Get current user's role in the active workspace
  const currentUserMember = members?.find((m) => m.userId === currentUserId)
  const currentUserRole: WorkspaceRole = currentUserMember?.role ?? 'member'

  return (
    <div className="px-4 pb-2">
      <div className="flex items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex-1 justify-between h-9 px-2"
            >
              <div className="flex items-center gap-2 truncate">
                <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate text-sm">
                  {activeWorkspace?.name || 'Personal'}
                </span>
              </div>
              <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[240px]">
            <DropdownMenuItem
              onClick={() => setActiveWorkspace(null)}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span>Personal</span>
              </div>
              {!activeWorkspace && <Check className="h-4 w-4" />}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {workspaces.map((workspace) => (
              <DropdownMenuItem
                key={workspace.id}
                onClick={() => setActiveWorkspace(workspace.id)}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span>{workspace.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {workspace.memberCount} members
                    </span>
                  </div>
                </div>
                {activeWorkspace?.id === workspace.id && (
                  <Check className="h-4 w-4" />
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => openModal('create-workspace')}>
              <Plus className="h-4 w-4 mr-2" />
              Create workspace
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {activeWorkspaceId && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={() => setShowSettings(true)}
                >
                  <Settings className="h-4 w-4 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Workspace settings</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {activeWorkspaceId && currentUserId && (
        <WorkspaceSettingsDialog
          open={showSettings}
          onOpenChange={setShowSettings}
          workspaceId={activeWorkspaceId}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
        />
      )}
    </div>
  )
}
