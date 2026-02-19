'use client'

import { useState, useCallback } from 'react'
import {
  ChevronDown,
  ChevronRight,
  FolderPlus,
  MoreHorizontal,
  Plus,
  Pencil,
  Trash2,
} from 'lucide-react'
import { useDroppable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { FolderTree, ConversationItem } from '@/components/folders'
import type { Project, Conversation, FolderTreeNode } from '@/types'

interface ProjectSectionProps {
  project: Project
  folders: FolderTreeNode[]
  conversations: Record<string, Conversation>
  unorganizedConversations: Conversation[]
  branchesByParent?: Record<string, Conversation[]>
  selectedConversationId?: string | null
  selectedFolderId?: string | null
  onSelectConversation: (id: string) => void
  onSelectFolder?: (id: string) => void
  onCreateFolder: (projectId: string, parentId?: string) => void
  onCreateConversation: (projectId: string, folderId?: string) => void
  onEditFolder?: (id: string) => void
  onDeleteFolder?: (id: string) => void
  onMoveFolder?: (id: string) => void
  onEditConversation?: (id: string) => void
  onDeleteConversation?: (id: string) => void
  onPinConversation?: (id: string) => void
  onMoveConversation?: (id: string) => void
  onEditProject?: (id: string) => void
  onDeleteProject?: (id: string) => void
  defaultExpanded?: boolean
  enableDragDrop?: boolean
}

export function ProjectSection({
  project,
  folders,
  conversations,
  unorganizedConversations,
  branchesByParent,
  selectedConversationId,
  selectedFolderId,
  onSelectConversation,
  onSelectFolder,
  onCreateFolder,
  onCreateConversation,
  onEditFolder,
  onDeleteFolder,
  onMoveFolder,
  onEditConversation,
  onDeleteConversation,
  onPinConversation,
  onMoveConversation,
  onEditProject,
  onDeleteProject,
  defaultExpanded = false,
  enableDragDrop = false,
}: ProjectSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const [isHovered, setIsHovered] = useState(false)

  // Drop zone for project root (conversations dropped here go to project without folder)
  const {
    setNodeRef: setDropRef,
    isOver,
  } = useDroppable({
    id: `project-drop-${project.id}`,
    data: {
      type: 'project' as const,
      projectId: project.id,
    },
    disabled: !enableDragDrop,
  })

  const totalConversations =
    unorganizedConversations.length +
    folders.reduce((acc, f) => acc + countFolderConversations(f), 0)

  const handleCreateSubfolder = useCallback(
    (parentId: string) => {
      onCreateFolder(project.id, parentId)
    },
    [onCreateFolder, project.id]
  )

  return (
    <div className="py-1">
      <div
        ref={setDropRef}
        className={cn(
          'flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer transition-colors hover:bg-muted',
          isOver && 'ring-2 ring-primary ring-inset bg-primary/10'
        )}
        onClick={() => setIsExpanded(!isExpanded)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Expand chevron */}
        <Button
          variant="ghost"
          size="icon"
          className="h-4 w-4 p-0 shrink-0"
          onClick={(e) => {
            e.stopPropagation()
            setIsExpanded(!isExpanded)
          }}
        >
          {isExpanded ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
        </Button>

        {/* Project color dot */}
        <div
          className="h-3 w-3 rounded-full shrink-0"
          style={{ backgroundColor: project.color }}
        />

        {/* Project name */}
        <span className="flex-1 truncate text-sm font-medium">
          {project.name}
        </span>

        {/* Conversation count */}
        {!isExpanded && totalConversations > 0 && (
          <span className="text-xs text-muted-foreground mr-1">
            ({totalConversations})
          </span>
        )}

        {/* Actions - visible on hover OR when expanded */}
        <div
          className={cn(
            'flex items-center gap-0.5 transition-opacity',
            (isHovered || isExpanded) ? 'opacity-100' : 'opacity-0'
          )}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation()
              onCreateConversation(project.id)
            }}
            title="New conversation"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation()
              onCreateFolder(project.id)
            }}
            title="New folder"
          >
            <FolderPlus className="h-3.5 w-3.5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  onCreateConversation(project.id)
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Conversation
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  onCreateFolder(project.id)
                }}
              >
                <FolderPlus className="h-4 w-4 mr-2" />
                New Folder
              </DropdownMenuItem>
              {onEditProject && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation()
                      onEditProject(project.id)
                    }}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit Project
                  </DropdownMenuItem>
                </>
              )}
              {onDeleteProject && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteProject(project.id)
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Project
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {isExpanded && (
        <div className="ml-2 mt-0.5 space-y-0.5">
          {/* Folder tree */}
          {folders.length > 0 && (
            <FolderTree
              folders={folders}
              conversations={conversations}
              branchesByParent={branchesByParent}
              selectedConversationId={selectedConversationId}
              selectedFolderId={selectedFolderId}
              onSelectConversation={onSelectConversation}
              onSelectFolder={onSelectFolder}
              onEditFolder={onEditFolder}
              onDeleteFolder={onDeleteFolder}
              onCreateSubfolder={handleCreateSubfolder}
              onMoveFolder={onMoveFolder}
              onEditConversation={onEditConversation}
              onDeleteConversation={onDeleteConversation}
              onPinConversation={onPinConversation}
              onMoveConversation={onMoveConversation}
              projectId={project.id}
              enableDragDrop={enableDragDrop}
            />
          )}

          {/* Unorganized conversations (directly in project, not in folder) */}
          {unorganizedConversations.map((conv) => (
            <ConversationItem
              key={conv.id}
              conversation={conv}
              depth={0}
              isSelected={conv.id === selectedConversationId}
              onSelect={() => onSelectConversation(conv.id)}
              onEdit={
                onEditConversation ? () => onEditConversation(conv.id) : undefined
              }
              onDelete={
                onDeleteConversation
                  ? () => onDeleteConversation(conv.id)
                  : undefined
              }
              onPin={
                onPinConversation ? () => onPinConversation(conv.id) : undefined
              }
              onMove={
                onMoveConversation ? () => onMoveConversation(conv.id) : undefined
              }
              branches={branchesByParent?.[conv.id]}
              selectedConversationId={selectedConversationId}
              onSelectConversation={onSelectConversation}
              onDeleteConversation={onDeleteConversation}
              onPinConversation={onPinConversation}
              onMoveConversation={onMoveConversation}
              enableDragDrop={enableDragDrop}
            />
          ))}

          {/* Empty state with action buttons */}
          {folders.length === 0 && unorganizedConversations.length === 0 && (
            <div className="px-4 py-3 flex flex-col gap-2">
              <p className="text-xs text-muted-foreground">No conversations yet</p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => onCreateFolder(project.id)}
                >
                  <FolderPlus className="h-3 w-3 mr-1.5" />
                  New Folder
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => onCreateConversation(project.id)}
                >
                  <Plus className="h-3 w-3 mr-1.5" />
                  New Chat
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function countFolderConversations(folder: FolderTreeNode): number {
  let count = folder.conversations.length
  for (const child of folder.children) {
    count += countFolderConversations(child)
  }
  return count
}
