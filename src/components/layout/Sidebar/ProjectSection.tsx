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
  onRenameConversation?: (id: string, newTitle: string) => void
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
  onRenameConversation,
  onDeleteConversation,
  onPinConversation,
  onMoveConversation,
  onEditProject,
  onDeleteProject,
  defaultExpanded = false,
  enableDragDrop = false,
}: ProjectSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

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

  const handleNewChatInFolder = useCallback(
    (folderId: string) => {
      onCreateConversation(project.id, folderId)
    },
    [onCreateConversation, project.id]
  )

  return (
    <div>
      {/* Project header */}
      <div
        ref={setDropRef}
        className={cn(
          'group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors hover:bg-muted',
          isOver && 'ring-2 ring-primary ring-inset bg-primary/10'
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Color dot */}
        <div
          className="h-2.5 w-2.5 rounded-full shrink-0"
          style={{ backgroundColor: project.color }}
        />

        {/* Name */}
        <span className="flex-1 truncate text-sm font-semibold">
          {project.name}
        </span>

        {/* Right side: count/chevron + hover actions */}
        <div className="shrink-0 flex items-center gap-1">
          {/* Count + chevron */}
          {!isExpanded && totalConversations > 0 && (
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {totalConversations}
            </span>
          )}
          <div className="shrink-0 text-muted-foreground">
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </div>

          {/* Hover actions */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={(e) => {
                e.stopPropagation()
                onCreateConversation(project.id)
              }}
              title="New conversation"
            >
              <Plus className="h-3 w-3" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-3 w-3" />
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
                      Edit Folder
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
                      Delete Folder
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="ml-2.5 pl-1.5 border-l border-border/40 flex flex-col gap-0.5">
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
              onNewChat={handleNewChatInFolder}
              onMoveFolder={onMoveFolder}
              onRenameConversation={onRenameConversation}
              onDeleteConversation={onDeleteConversation}
              onPinConversation={onPinConversation}
              onMoveConversation={onMoveConversation}
              projectId={project.id}
              enableDragDrop={enableDragDrop}
            />
          )}

          {/* Unorganized conversations */}
          {unorganizedConversations.map((conv) => (
            <ConversationItem
              key={conv.id}
              conversation={conv}
              depth={0}
              isSelected={conv.id === selectedConversationId}
              onSelect={() => onSelectConversation(conv.id)}
              onRename={onRenameConversation}
              onRenameConversation={onRenameConversation}
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

          {/* Empty state */}
          {folders.length === 0 && unorganizedConversations.length === 0 && (
            <div className="py-3 px-2">
              <p className="text-xs text-muted-foreground mb-2">No conversations yet</p>
              <div className="flex gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-[11px] px-2"
                  onClick={() => onCreateFolder(project.id)}
                >
                  <FolderPlus className="h-3 w-3 mr-1" />
                  Folder
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-[11px] px-2"
                  onClick={() => onCreateConversation(project.id)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Chat
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
