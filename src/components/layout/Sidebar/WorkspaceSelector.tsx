'use client'

import { Check, ChevronsUpDown, Building2, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useActiveWorkspaceId, useWorkspaceUIActions, useUIActions } from '@/stores'
import { useWorkspaces, useWorkspace } from '@/lib/queries'

export function WorkspaceSelector() {
  const { data: workspaces = [] } = useWorkspaces('user-1') // TODO: Get from auth
  const activeWorkspaceId = useActiveWorkspaceId()
  const { data: activeWorkspace } = useWorkspace(activeWorkspaceId)
  const { setActiveWorkspace } = useWorkspaceUIActions()
  const { openModal } = useUIActions()

  return (
    <div className="px-4 pb-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between h-9 px-2"
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
    </div>
  )
}
