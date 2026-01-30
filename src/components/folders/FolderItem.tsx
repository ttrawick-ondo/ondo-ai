'use client'

import { useState } from 'react'
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { FolderTreeNode } from '@/types'

interface FolderItemProps {
  folder: FolderTreeNode
  isExpanded: boolean
  onToggle: () => void
  onSelect?: (folderId: string) => void
  onEdit?: (folderId: string) => void
  onDelete?: (folderId: string) => void
  onCreateSubfolder?: (parentId: string) => void
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
  onMove,
  isSelected,
  children,
  projectId,
  enableDragDrop = false,
}: FolderItemProps) {
  const [isHovered, setIsHovered] = useState(false)
  const hasChildren = folder.children.length > 0 || folder.conversations.length > 0
  const totalItems = folder.children.length + folder.conversations.length

  // Drag and drop hooks
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

  // Combine refs for both draggable and droppable
  const setRefs = (node: HTMLDivElement | null) => {
    setDragRef(node)
    setDropRef(node)
  }

  return (
    <div className={cn('select-none', isDragging && 'opacity-50')}>
      <div
        ref={setRefs}
        className={cn(
          'group flex items-center gap-1 rounded-md px-2 py-1 text-sm cursor-pointer transition-colors',
          isSelected
            ? 'bg-secondary text-secondary-foreground'
            : 'hover:bg-muted text-muted-foreground hover:text-foreground',
          isOver && 'ring-2 ring-primary ring-inset bg-primary/10'
        )}
        style={{ paddingLeft: `${(folder.depth + 1) * 12}px` }}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        {...(enableDragDrop ? dragAttributes : {})}
        {...(enableDragDrop ? dragListeners : {})}
      >
        {/* Expand/Collapse chevron */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-4 w-4 p-0 shrink-0',
            !hasChildren && 'invisible'
          )}
          onClick={(e) => {
            e.stopPropagation()
            onToggle()
          }}
        >
          {isExpanded ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
        </Button>

        {/* Folder icon */}
        <div className="shrink-0" style={{ color: folder.color ?? undefined }}>
          {isExpanded ? (
            <FolderOpen className="h-4 w-4" />
          ) : (
            <Folder className="h-4 w-4" />
          )}
        </div>

        {/* Folder name */}
        <span className="flex-1 truncate font-medium">{folder.name}</span>

        {/* Item count badge */}
        {totalItems > 0 && !isExpanded && (
          <span className="text-xs text-muted-foreground mr-1">
            ({totalItems})
          </span>
        )}

        {/* Quick add subfolder button - visible on hover */}
        {onCreateSubfolder && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'h-5 w-5 shrink-0 transition-opacity',
                    isHovered ? 'opacity-100' : 'opacity-0'
                  )}
                  onClick={(e) => {
                    e.stopPropagation()
                    onCreateSubfolder(folder.id)
                  }}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>New subfolder</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Actions dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-5 w-5 shrink-0 transition-opacity',
                isHovered ? 'opacity-100' : 'opacity-0'
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {onCreateSubfolder && (
              <DropdownMenuItem
                onClick={(e) => handleContextAction(e, () => onCreateSubfolder(folder.id))}
              >
                <FolderPlus className="h-4 w-4 mr-2" />
                New Subfolder
              </DropdownMenuItem>
            )}
            {onEdit && (
              <DropdownMenuItem
                onClick={(e) => handleContextAction(e, () => onEdit(folder.id))}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Rename
              </DropdownMenuItem>
            )}
            {onMove && (
              <DropdownMenuItem
                onClick={(e) => handleContextAction(e, () => onMove(folder.id))}
              >
                <MoveRight className="h-4 w-4 mr-2" />
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
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Render children when expanded */}
      {isExpanded && children}
    </div>
  )
}
