'use client'

import { useState, useEffect } from 'react'
import { Settings, Users, UserPlus, Building2, Trash2 } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Separator } from '@/components/ui/separator'
import { MemberManagement } from './MemberManagement'
import { AddMemberDialog } from './AddMemberDialog'
import { useWorkspace, useUpdateWorkspace, useDeleteWorkspace } from '@/lib/queries'
import type { WorkspaceRole } from '@/types'

interface WorkspaceSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaceId: string
  currentUserId: string
  currentUserRole: WorkspaceRole
}

export function WorkspaceSettingsDialog({
  open,
  onOpenChange,
  workspaceId,
  currentUserId,
  currentUserRole,
}: WorkspaceSettingsDialogProps) {
  const { data: workspace } = useWorkspace(workspaceId)
  const updateWorkspace = useUpdateWorkspace()
  const deleteWorkspace = useDeleteWorkspace()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [showAddMember, setShowAddMember] = useState(false)
  const [activeTab, setActiveTab] = useState('general')

  useEffect(() => {
    if (workspace) {
      setName(workspace.name)
      setDescription(workspace.description || '')
    }
  }, [workspace])

  const canManageWorkspace = currentUserRole === 'owner' || currentUserRole === 'admin'
  const isOwner = currentUserRole === 'owner'

  const handleSaveGeneral = () => {
    if (!name.trim()) return
    updateWorkspace.mutate({
      workspaceId,
      data: {
        name: name.trim(),
        description: description.trim() || undefined,
      },
    })
  }

  const handleDeleteWorkspace = () => {
    deleteWorkspace.mutate(workspaceId, {
      onSuccess: () => {
        onOpenChange(false)
      },
    })
  }

  const hasGeneralChanges =
    workspace && (name !== workspace.name || description !== (workspace.description || ''))

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Workspace Settings
            </DialogTitle>
            <DialogDescription>
              Manage your workspace settings and team members.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="general" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                General
              </TabsTrigger>
              <TabsTrigger value="members" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Members
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Workspace name"
                    disabled={!canManageWorkspace}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="A brief description of this workspace..."
                    rows={3}
                    disabled={!canManageWorkspace}
                  />
                </div>

                {canManageWorkspace && (
                  <div className="flex justify-end">
                    <Button
                      onClick={handleSaveGeneral}
                      disabled={!hasGeneralChanges || updateWorkspace.isPending}
                    >
                      {updateWorkspace.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                )}
              </div>

              {isOwner && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label className="text-destructive">Danger Zone</Label>
                    <p className="text-sm text-muted-foreground">
                      Deleting a workspace will permanently remove all its data, including
                      projects, conversations, and members.
                    </p>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="mt-2">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Workspace
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Workspace</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete{' '}
                            <span className="font-medium">{workspace?.name}</span>? This action
                            cannot be undone and will permanently delete all workspace data.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDeleteWorkspace}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {deleteWorkspace.isPending ? 'Deleting...' : 'Delete'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="members" className="mt-4">
              <div className="space-y-4">
                {canManageWorkspace && (
                  <div className="flex justify-end">
                    <Button onClick={() => setShowAddMember(true)}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Members
                    </Button>
                  </div>
                )}

                <MemberManagement
                  workspaceId={workspaceId}
                  ownerId={workspace?.ownerId || ''}
                  currentUserId={currentUserId}
                  currentUserRole={currentUserRole}
                />
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <AddMemberDialog
        open={showAddMember}
        onOpenChange={setShowAddMember}
        workspaceId={workspaceId}
      />
    </>
  )
}
