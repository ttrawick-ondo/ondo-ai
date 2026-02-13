'use client'

import { useState } from 'react'
import { MoreHorizontal, Shield, ShieldCheck, Crown, Trash2, UserMinus } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useWorkspaceMembers,
  useUpdateMemberRole,
  useRemoveMember,
} from '@/lib/queries'
import type { WorkspaceMember, WorkspaceRole } from '@/types'

interface MemberManagementProps {
  workspaceId: string
  ownerId: string
  currentUserId: string
  currentUserRole: WorkspaceRole
}

const roleConfig: Record<WorkspaceRole, { label: string; icon: typeof Crown; color: string }> = {
  owner: { label: 'Owner', icon: Crown, color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
  admin: { label: 'Admin', icon: ShieldCheck, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  member: { label: 'Member', icon: Shield, color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' },
  viewer: { label: 'Viewer', icon: Shield, color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
}

function getInitials(name: string | undefined, email: string): string {
  if (name) {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }
  return email.slice(0, 2).toUpperCase()
}

export function MemberManagement({
  workspaceId,
  ownerId,
  currentUserId,
  currentUserRole,
}: MemberManagementProps) {
  const { data: members, isLoading } = useWorkspaceMembers(workspaceId)
  const updateRole = useUpdateMemberRole()
  const removeMember = useRemoveMember()

  const [memberToRemove, setMemberToRemove] = useState<WorkspaceMember | null>(null)

  const canManageMembers = currentUserRole === 'owner' || currentUserRole === 'admin'

  const handleRoleChange = (userId: string, newRole: WorkspaceRole) => {
    if (newRole === 'owner') return // Can't change role to owner
    updateRole.mutate({ workspaceId, userId, role: newRole })
  }

  const handleRemoveMember = () => {
    if (!memberToRemove) return
    removeMember.mutate(
      { workspaceId, userId: memberToRemove.userId },
      { onSuccess: () => setMemberToRemove(null) }
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 p-2">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <>
      <div className="space-y-1">
        {members?.map((member) => {
          const isOwner = member.userId === ownerId
          const isSelf = member.userId === currentUserId
          const config = roleConfig[member.role]
          const Icon = config.icon

          return (
            <div
              key={member.id}
              className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted/50"
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={member.user.avatarUrl} />
                <AvatarFallback>
                  {getInitials(member.user.name, member.user.email)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">
                    {member.user.name || member.user.email.split('@')[0]}
                  </span>
                  {isSelf && (
                    <span className="text-xs text-muted-foreground">(you)</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {member.user.email}
                </p>
              </div>

              <Badge variant="secondary" className={config.color}>
                <Icon className="h-3 w-3 mr-1" />
                {config.label}
              </Badge>

              {canManageMembers && !isOwner && !isSelf && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {member.role !== 'admin' && (
                      <DropdownMenuItem onClick={() => handleRoleChange(member.userId, 'admin')}>
                        <ShieldCheck className="h-4 w-4 mr-2" />
                        Make Admin
                      </DropdownMenuItem>
                    )}
                    {member.role !== 'member' && (
                      <DropdownMenuItem onClick={() => handleRoleChange(member.userId, 'member')}>
                        <Shield className="h-4 w-4 mr-2" />
                        Make Member
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setMemberToRemove(member)}
                      className="text-destructive focus:text-destructive"
                    >
                      <UserMinus className="h-4 w-4 mr-2" />
                      Remove from Workspace
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )
        })}
      </div>

      <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{' '}
              <span className="font-medium">
                {memberToRemove?.user.name || memberToRemove?.user.email}
              </span>{' '}
              from this workspace? They will lose access to all workspace resources.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeMember.isPending ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
