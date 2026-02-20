'use client'

import { useState } from 'react'
import { Plus, FolderKanban, MessageSquare, Folder, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn, formatRelativeTime } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog'
import { useProjects, useProjectActions, useFolders, useProjectLoading, useProjectsInitialized, useActiveWorkspaceId, useCurrentUser } from '@/stores'
import { PROJECT_COLORS } from '@/types'

export default function ProjectsPage() {
  const router = useRouter()
  const currentUser = useCurrentUser()
  const activeWorkspaceId = useActiveWorkspaceId()
  const projects = useProjects(activeWorkspaceId)
  const folders = useFolders()
  const isLoading = useProjectLoading()
  const isInitialized = useProjectsInitialized()
  const { createProject, deleteProject, setActiveProject } = useProjectActions()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newProject, setNewProject] = useState({ name: '', description: '', color: PROJECT_COLORS[0] as string })

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<{ id: string; name: string } | null>(null)

  // Show all projects (same as sidebar)
  const filteredProjects = projects

  // Count folders per project
  const folderCountByProject = folders.reduce((acc, folder) => {
    acc[folder.projectId] = (acc[folder.projectId] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const handleCreate = () => {
    if (!newProject.name.trim() || !currentUser?.id) return
    createProject({
      name: newProject.name,
      description: newProject.description,
      color: newProject.color,
      workspaceId: activeWorkspaceId, // null for Personal space
      userId: currentUser.id,
    })
    setNewProject({ name: '', description: '', color: PROJECT_COLORS[0] })
    setIsCreateOpen(false)
  }

  const handleOpen = (projectId: string) => {
    setActiveProject(projectId)
    router.push(`/projects/${projectId}`)
  }

  const handleDeleteClick = (e: React.MouseEvent, project: { id: string; name: string }) => {
    e.stopPropagation()
    setProjectToDelete(project)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = () => {
    if (projectToDelete) {
      deleteProject(projectToDelete.id)
      setProjectToDelete(null)
    }
  }

  // Loading state
  if (isLoading && !isInitialized) {
    return (
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <Skeleton className="h-5 w-32" />
                </div>
                <Skeleton className="h-4 w-48 mt-2" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Folders</h1>
          <p className="text-muted-foreground">
            Organize your conversations into folders
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Folder
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Folder</DialogTitle>
              <DialogDescription>
                Create a new folder to organize related conversations.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input
                  placeholder="Folder name"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  placeholder="Optional description"
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Color</label>
                <div className="flex flex-wrap gap-2">
                  {PROJECT_COLORS.map((color) => (
                    <button
                      key={color}
                      className={cn(
                        'h-8 w-8 rounded-full transition-transform',
                        newProject.color === color && 'ring-2 ring-offset-2 ring-primary scale-110'
                      )}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewProject({ ...newProject, color: color as string })}
                    />
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={!newProject.name.trim()}>
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {filteredProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FolderKanban className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-1">No folders yet</h3>
          <p className="text-muted-foreground mb-4">
            Create a folder to organize your conversations
          </p>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create First Folder
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <Card
              key={project.id}
              className="group cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => handleOpen(project.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-4 w-4 rounded-full"
                      style={{ backgroundColor: project.color }}
                    />
                    <CardTitle className="text-base">{project.name}</CardTitle>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={(e) => handleDeleteClick(e, { id: project.id, name: project.name })}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {project.description && (
                  <CardDescription className="line-clamp-2">
                    {project.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <MessageSquare className="h-4 w-4" />
                    <span>{project.conversationCount} conversations</span>
                  </div>
                  {folderCountByProject[project.id] > 0 && (
                    <div className="flex items-center gap-1">
                      <Folder className="h-4 w-4" />
                      <span>{folderCountByProject[project.id]} folders</span>
                    </div>
                  )}
                  <span>Updated {formatRelativeTime(project.updatedAt)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        itemName={projectToDelete?.name}
        itemType="folder"
      />
    </div>
  )
}
