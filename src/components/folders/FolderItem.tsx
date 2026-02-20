'use client'

import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  MoreHorizontal,
  Pencil,
  Trash2,
  FolderPlus,
  MoveRight,
  Plus,
} from 'lucide-react'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { FolderTreeNode } from '@/types'

interface FolderItemProps {
  folder: FolderTreeNode
  isExpanded: boolean
  onToggle: () => void
  onSelect?: (folderId: string) => void
  onEdit?: (folderId: string) => void
  onDelete?: (folderId: string) => void
  onCreateSubfolder?: (parentId: string) => void
  onNewChat?: (folderId: string) => void
  onMove?: (folderId: string) => void
  isSelected?: boolean
  children?: React.ReactNode
  projectId?: string
  enableDragDrop?: boolean
}

export function FolderItem({
  folder,
  isExpanded,
  onToggle,
  onSelect,
  onEdit,
  onDelete,
  onCreateSubfolder,
  onNewChat,
  onMove,
  isSelected,
  children,
  projectId,
  enableDragDrop = false,
}: FolderItemProps) {
  const hasChildren = folder.children.length > 0 || folder.conversations.length > 0
  const totalItems = folder.children.length + folder.conversations.length

  const {
    attributes: dragAttributes,
    listeners: dragListeners,
    setNodeRef: setDragRef,
    isDragging,
  } = useDraggable({
    id: `folder-${folder.id}`,
    data: {
      type: 'folder' as const,
      item: folder,
    },
    disabled: !enableDragDrop,
  })

  const {
    setNodeRef: setDropRef,
    isOver,
  } = useDroppable({
    id: `folder-drop-${folder.id}`,
    data: {
      type: 'folder' as const,
      folderId: folder.id,
      projectId,
    },
    disabled: !enableDragDrop,
  })

  const handleClick = () => {
    if (hasChildren) {
      onToggle()
    }
    onSelect?.(folder.id)
  }

  const handleContextAction = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation()
    action()
  }

  const setRefs = (node: HTMLDivElement | null) => {
    setDragRef(node)
    setDropRef(node)
  }

  return (
    <div className={cn('select-none', isDragging && 'opacity-50')}>
      <div
        ref={setRefs}
        className={cn(
          'group flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[13px] cursor-pointer transition-colors',
          isSelected
            ? 'bg-secondary text-secondary-foreground'
            : 'hover:bg-muted text-muted-foreground hover:text-foreground',
          isOver && 'ring-2 ring-primary ring-inset bg-primary/10'
        )}
        onClick={handleClick}
        {...(enableDragDrop ? dragAttributes : {})}
        {...(enableDragDrop ? dragListeners : {})}
      >
        {/* Folder icon */}
        <div className="shrink-0" style={{ color: folder.color ?? undefined }}>
          {isExpanded ? (
            <FolderOpen className="h-3.5 w-3.5" />
          ) : (
            <Folder className="h-3.5 w-3.5" />
          )}
        </div>

        {/* Folder name */}
        <span className="flex-1 truncate font-medium leading-snug">{folder.name}</span>

        {/* Right side: count/chevron + hover actions */}
        <div className="shrink-0 flex items-center">
          {/* Count + expand chevron */}
          {hasChildren && (
            <button
              className="flex items-center gap-px text-[10px] text-muted-foreground hover:text-foreground transition-colors group-hover:mr-0.5"
              onClick={(e) => {
                e.stopPropagation()
                onToggle()
              }}
            >
              {!isExpanded && <span className="tabular-nums">{totalItems}</span>}
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </button>
          )}

          {/* Hover actions */}
          <div className="flex items-center opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
            {onNewChat && (
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4"
                onClick={(e) => {
                  e.stopPropagation()
                  onNewChat(folder.id)
                }}
                title="New chat"
              >
                <Plus className="h-2.5 w-2.5" />
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {onCreateSubfolder && (
                  <DropdownMenuItem
                    onClick={(e) => handleContextAction(e, () => onCreateSubfolder(folder.id))}
                  >
                    <FolderPlus className="h-3.5 w-3.5 mr-2" />
                    New Subfolder
                  </DropdownMenuItem>
                )}
                {onEdit && (
                  <DropdownMenuItem
                    onClick={(e) => handleContextAction(e, () => onEdit(folder.id))}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-2" />
                    Rename
                  </DropdownMenuItem>
                )}
                {onMove && (
                  <DropdownMenuItem
                    onClick={(e) => handleContextAction(e, () => onMove(folder.id))}
                  >
                    <MoveRight className="h-3.5 w-3.5 mr-2" />
                    Move
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={(e) => handleContextAction(e, () => onDelete(folder.id))}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Render children when expanded — indented with a subtle left border */}
      {isExpanded && (
        <div className="ml-2.5 pl-1.5 border-l border-border/40">
          {children}
        </div>
      )}
    </div>
  )
}
