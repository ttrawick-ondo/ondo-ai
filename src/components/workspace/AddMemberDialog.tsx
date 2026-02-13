'use client'

import { useState, useMemo } from 'react'
import { Search, UserPlus, Mail, Clock, X, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  useSearchUsers,
  useAddMember,
  useWorkspaceInvitations,
  useCreateInvitation,
  useDeleteInvitation,
} from '@/lib/queries'
import type { WorkspaceRole, User } from '@/types'
import { cn } from '@/lib/utils'

interface AddMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaceId: string
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

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function AddMemberDialog({ open, onOpenChange, workspaceId }: AddMemberDialogProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRole, setSelectedRole] = useState<WorkspaceRole>('member')

  const { data: searchResults = [], isLoading: isSearching } = useSearchUsers(
    searchQuery,
    workspaceId
  )
  const { data: invitations = [], isLoading: isLoadingInvitations } = useWorkspaceInvitations(workspaceId)

  const addMember = useAddMember()
  const createInvitation = useCreateInvitation()
  const deleteInvitation = useDeleteInvitation()

  const showInviteOption = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return false
    if (!isValidEmail(searchQuery)) return false
    // Don't show invite if user exists in search results
    const exactMatch = searchResults.some(
      (u) => u.email.toLowerCase() === searchQuery.toLowerCase()
    )
    return !exactMatch
  }, [searchQuery, searchResults])

  const handleAddMember = (user: User) => {
    addMember.mutate(
      { workspaceId, userId: user.id, role: selectedRole },
      {
        onSuccess: () => {
          setSearchQuery('')
        },
      }
    )
  }

  const handleSendInvitation = () => {
    if (!isValidEmail(searchQuery)) return
    createInvitation.mutate(
      { workspaceId, email: searchQuery, role: selectedRole },
      {
        onSuccess: () => {
          setSearchQuery('')
        },
      }
    )
  }

  const handleCancelInvitation = (invitationId: string) => {
    deleteInvitation.mutate({ workspaceId, invitationId })
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSearchQuery('')
      setSelectedRole('member')
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add Members
          </DialogTitle>
          <DialogDescription>
            Search for existing users or invite new members by email.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>
            <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as WorkspaceRole)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="member">Member</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Search Results */}
          {searchQuery.length >= 2 && (
            <div className="border rounded-lg">
              <ScrollArea className="max-h-[200px]">
                {isSearching ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="p-1">
                    {searchResults.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between gap-2 rounded-md p-2 hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatarUrl} />
                            <AvatarFallback>
                              {getInitials(user.name, user.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {user.name || user.email.split('@')[0]}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {user.email}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleAddMember(user)}
                          disabled={addMember.isPending}
                        >
                          {addMember.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Add'
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-4 text-center text-sm text-muted-foreground">
                    No users found
                  </div>
                )}
              </ScrollArea>

              {/* Invite Option */}
              {showInviteOption && (
                <>
                  <Separator />
                  <div className="p-2">
                    <div className="flex items-center justify-between gap-2 rounded-md p-2 bg-muted/30">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Mail className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            Invite {searchQuery}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Send an invitation email
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleSendInvitation}
                        disabled={createInvitation.isPending}
                      >
                        {createInvitation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Invite'
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Pending Invitations */}
          {invitations.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">
                Pending Invitations ({invitations.length})
              </Label>
              <div className="border rounded-lg">
                <ScrollArea className="max-h-[150px]">
                  <div className="p-1">
                    {invitations.map((invitation) => (
                      <div
                        key={invitation.id}
                        className="flex items-center justify-between gap-2 rounded-md p-2 hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {invitation.email}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Expires {invitation.expiresAt.toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {invitation.role}
                          </Badge>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => handleCancelInvitation(invitation.id)}
                            disabled={deleteInvitation.isPending}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
