'use client'

import { useState, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core'
import { Folder, MessageSquare, Pin, GitBranch } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Conversation, FolderTreeNode } from '@/types'

export type DragItemType = 'conversation' | 'folder'

export interface DragItem {
  type: DragItemType
  id: string
  data: Conversation | FolderTreeNode
}

interface SidebarDndContextProps {
  children: React.ReactNode
  conversations: Record<string, Conversation>
  folders: Record<string, FolderTreeNode>
  onMoveConversation: (conversationId: string, targetFolderId: string | null, targetProjectId?: string | null) => void
  onMoveFolder: (folderId: string, targetParentId: string | null, targetProjectId?: string) => void
}

export function SidebarDndContext({
  children,
  conversations,
  folders,
  onMoveConversation,
  onMoveFolder,
}: SidebarDndContextProps) {
  const [activeItem, setActiveItem] = useState<DragItem | null>(null)
  const [overId, setOverId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Start dragging after 8px movement
      },
    }),
    useSensor(KeyboardSensor)
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event
    const dragData = active.data.current as { type: DragItemType; item: Conversation | FolderTreeNode } | undefined

    if (!dragData) return

    setActiveItem({
      type: dragData.type,
      id: active.id as string,
      data: dragData.item,
    })
  }, [])

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event
    setOverId(over?.id as string | null)
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event

    setActiveItem(null)
    setOverId(null)

    if (!over || active.id === over.id) return

    const dragData = active.data.current as { type: DragItemType; item: Conversation | FolderTreeNode } | undefined
    const dropData = over.data.current as { type: 'folder' | 'project' | 'root'; folderId?: string; projectId?: string } | undefined

    if (!dragData || !dropData) return

    if (dragData.type === 'conversation') {
      // Moving a conversation
      const conversation = dragData.item as Conversation

      if (dropData.type === 'folder') {
        // Moving to a folder
        onMoveConversation(conversation.id, dropData.folderId ?? null, dropData.projectId ?? null)
      } else if (dropData.type === 'project') {
        // Moving to project root (no folder)
        onMoveConversation(conversation.id, null, dropData.projectId ?? null)
      } else if (dropData.type === 'root') {
        // Moving to unorganized (no project, no folder)
        onMoveConversation(conversation.id, null, null)
      }
    } else if (dragData.type === 'folder') {
      // Moving a folder
      const folder = dragData.item as FolderTreeNode

      if (dropData.type === 'folder' && dropData.folderId) {
        // Moving into another folder (making it a subfolder)
        // Prevent moving a folder into itself or its descendants
        if (!isFolderDescendant(folders, folder.id, dropData.folderId)) {
          onMoveFolder(folder.id, dropData.folderId, dropData.projectId)
        }
      } else if (dropData.type === 'project') {
        // Moving to project root
        onMoveFolder(folder.id, null, dropData.projectId)
      }
    }
  }, [folders, onMoveConversation, onMoveFolder])

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      {children}
      <DragOverlay dropAnimation={null}>
        {activeItem && (
          <DragOverlayItem item={activeItem} />
        )}
      </DragOverlay>
    </DndContext>
  )
}

// Helper to check if targetId is a descendant of folderId
function isFolderDescendant(
  folders: Record<string, FolderTreeNode>,
  folderId: string,
  targetId: string
): boolean {
  if (folderId === targetId) return true

  const folder = folders[folderId]
  if (!folder) return false

  for (const child of folder.children) {
    if (isFolderDescendant(folders, child.id, targetId)) {
      return true
    }
  }

  return false
}

// Drag overlay component for visual feedback
function DragOverlayItem({ item }: { item: DragItem }) {
  if (item.type === 'conversation') {
    const conversation = item.data as Conversation
    return (
      <div className="flex items-center gap-2 rounded-md bg-background border shadow-lg px-3 py-2 text-sm">
        <div className="flex items-center gap-1">
          {conversation.parentId ? (
            <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <MessageSquare className="h-4 w-4" />
          )}
          {conversation.pinned && (
            <Pin className="h-3 w-3 text-amber-500" />
          )}
        </div>
        <span className="truncate max-w-[200px]">{conversation.title}</span>
      </div>
    )
  }

  if (item.type === 'folder') {
    const folder = item.data as FolderTreeNode
    return (
      <div className="flex items-center gap-2 rounded-md bg-background border shadow-lg px-3 py-2 text-sm">
        <Folder className="h-4 w-4" style={{ color: folder.color ?? undefined }} />
        <span className="truncate max-w-[200px] font-medium">{folder.name}</span>
      </div>
    )
  }

  return null
}

// Context for checking if we're over a valid drop target
export interface DropTargetState {
  isOver: boolean
  canDrop: boolean
}
