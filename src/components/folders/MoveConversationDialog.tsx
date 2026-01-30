'use client'

import { useState, useMemo } from 'react'
import { MoveRight, Folder, FolderOpen, ChevronRight, ChevronDown } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { Project, FolderTreeNode } from '@/types'

interface MoveConversationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (projectId: string | null, folderId: string | null) => void
  conversationTitle: string
  projects: Project[]
  foldersByProject: Record<string, FolderTreeNode[]>
  currentProjectId?: string | null
  currentFolderId?: string | null
}

export function MoveConversationDialog({
  open,
  onOpenChange,
  onSubmit,
  conversationTitle,
  projects,
  foldersByProject,
  currentProjectId,
  currentFolderId,
}: MoveConversationDialogProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    currentProjectId ?? null
  )
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(
    currentFolderId ?? null
  )
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(
    new Set(currentProjectId ? [currentProjectId] : [])
  )
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [isSubmitting, setIsSubmitting] = useState(false)

  const toggleProject = (projectId: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev)
      if (next.has(projectId)) {
        next.delete(projectId)
      } else {
        next.add(projectId)
      }
      return next
    })
  }

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(folderId)) {
        next.delete(folderId)
      } else {
        next.add(folderId)
      }
      return next
    })
  }

  const handleSelectProject = (projectId: string) => {
    setSelectedProjectId(projectId)
    setSelectedFolderId(null)
    if (!expandedProjects.has(projectId)) {
      toggleProject(projectId)
    }
  }

  const handleSelectFolder = (folderId: string) => {
    setSelectedFolderId(folderId)
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      await onSubmit(selectedProjectId, selectedFolderId)
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedProjectId(currentProjectId ?? null)
      setSelectedFolderId(currentFolderId ?? null)
    }
    onOpenChange(newOpen)
  }

  const renderFolder = (folder: FolderTreeNode, depth: number = 0) => {
    const isExpanded = expandedFolders.has(folder.id)
    const isSelected = selectedFolderId === folder.id
    const hasChildren = folder.children.length > 0

    return (
      <div key={folder.id}>
        <div
          className={cn(
            'flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors',
            isSelected
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-muted'
          )}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => handleSelectFolder(folder.id)}
        >
          {hasChildren && (
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4 p-0"
              onClick={(e) => {
                e.stopPropagation()
                toggleFolder(folder.id)
              }}
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </Button>
          )}
          {!hasChildren && <div className="w-4" />}
          <div style={{ color: folder.color ?? undefined }}>
            {isExpanded ? (
              <FolderOpen className="h-4 w-4" />
            ) : (
              <Folder className="h-4 w-4" />
            )}
          </div>
          <span className="text-sm truncate">{folder.name}</span>
        </div>
        {isExpanded &&
          folder.children.map((child) => renderFolder(child, depth + 1))}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MoveRight className="h-5 w-5" />
            Move Conversation
          </DialogTitle>
          <DialogDescription>
            Move &quot;{conversationTitle}&quot; to a different project or folder.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[300px] border rounded-md">
          <div className="p-2">
            {/* No project option */}
            <div
              className={cn(
                'flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors',
                selectedProjectId === null
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              )}
              onClick={() => {
                setSelectedProjectId(null)
                setSelectedFolderId(null)
              }}
            >
              <span className="text-sm">No Project (Recent)</span>
            </div>

            {/* Projects */}
            {projects.map((project) => {
              const isProjectExpanded = expandedProjects.has(project.id)
              const isProjectSelected =
                selectedProjectId === project.id && selectedFolderId === null
              const folders = foldersByProject[project.id] || []

              return (
                <div key={project.id} className="mt-1">
                  <div
                    className={cn(
                      'flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors',
                      isProjectSelected
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    )}
                    onClick={() => handleSelectProject(project.id)}
                  >
                    {folders.length > 0 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 p-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleProject(project.id)
                        }}
                      >
                        {isProjectExpanded ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronRight className="h-3 w-3" />
                        )}
                      </Button>
                    )}
                    {folders.length === 0 && <div className="w-4" />}
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: project.color }}
                    />
                    <span className="text-sm truncate">{project.name}</span>
                  </div>
                  {isProjectExpanded &&
                    folders.map((folder) => renderFolder(folder, 1))}
                </div>
              )
            })}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Moving...' : 'Move'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
