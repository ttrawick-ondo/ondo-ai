'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Settings, Plus, MessageSquare, FolderPlus, Folder, ChevronRight, ChevronDown, Pin, GitBranch } from 'lucide-react'
import Link from 'next/link'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { cn, formatRelativeTime } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  useProjectById,
  useProjectActions,
  useConversations,
  useChatActions,
  useProjectFolders,
  useFolderActions,
  useFolderExpanded,
  useActiveWorkspaceId,
} from '@/stores'
import { CreateFolderDialog } from '@/components/folders'
import type { Folder as FolderType, Conversation } from '@/types'

type DragItem = {
  type: 'conversation' | 'folder'
  id: string
  data: Conversation | FolderType
}

// Helper to check if targetId is a descendant of folderId
function isFolderDescendant(allFolders: FolderType[], folderId: string, targetId: string): boolean {
  if (folderId === targetId) return true
  const children = allFolders.filter(f => f.parentId === folderId)
  for (const child of children) {
    if (isFolderDescendant(allFolders, child.id, targetId)) return true
  }
  return false
}

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string
  const project = useProjectById(projectId)
  const { setActiveProject } = useProjectActions()
  const activeWorkspaceId = useActiveWorkspaceId()
  const conversations = useConversations(activeWorkspaceId)
  const { createConversation, setActiveConversation, moveConversationToFolder } = useChatActions()
  const folders = useProjectFolders(projectId)
  const { createFolder, moveFolder } = useFolderActions()

  // Dialog state
  const [createFolderOpen, setCreateFolderOpen] = useState(false)
  const [createFolderParentId, setCreateFolderParentId] = useState<string | undefined>()
  const [createFolderParentName, setCreateFolderParentName] = useState<string | undefined>()

  // Drag and drop state
  const [activeItem, setActiveItem] = useState<DragItem | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // Filter conversations for this project
  const projectConversations = conversations.filter((c) => c.projectId === projectId)

  // Group conversations by folder
  const conversationsByFolder = projectConversations.reduce((acc, conv) => {
    const key = conv.folderId || 'root'
    if (!acc[key]) acc[key] = []
    acc[key].push(conv)
    return acc
  }, {} as Record<string, Conversation[]>)

  // Get root folders and unorganized conversations
  const rootFolders = folders.filter((f) => !f.parentId)
  const unorganizedConversations = conversationsByFolder['root'] || []

  useEffect(() => {
    if (project) {
      setActiveProject(projectId)
    }
  }, [project, projectId, setActiveProject])

  const handleNewChat = async (folderId?: string) => {
    const id = await createConversation('New conversation', projectId, undefined, folderId || null, activeWorkspaceId)
    setActiveConversation(id)
    router.push(`/chat/${id}`)
  }

  const handleOpenConversation = (conversationId: string) => {
    setActiveConversation(conversationId)
    router.push(`/chat/${conversationId}`)
  }

  const handleCreateFolder = (parentId?: string, parentName?: string) => {
    setCreateFolderParentId(parentId)
    setCreateFolderParentName(parentName)
    setCreateFolderOpen(true)
  }

  const handleSubmitCreateFolder = (data: { name: string; color: string | null }) => {
    createFolder({
      projectId,
      parentId: createFolderParentId ?? null,
      name: data.name,
      color: data.color,
    })
  }

  // Drag and drop handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event
    const dragData = active.data.current as { type: 'conversation' | 'folder'; item: Conversation | FolderType } | undefined
    if (!dragData) return

    setActiveItem({
      type: dragData.type,
      id: active.id as string,
      data: dragData.item,
    })
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    setActiveItem(null)

    if (!over || active.id === over.id) return

    const dragData = active.data.current as { type: 'conversation' | 'folder'; item: Conversation | FolderType } | undefined
    const dropData = over.data.current as { type: 'folder' | 'root'; folderId?: string } | undefined

    if (!dragData || !dropData) return

    if (dragData.type === 'conversation') {
      const conversation = dragData.item as Conversation
      if (dropData.type === 'folder' && dropData.folderId) {
        moveConversationToFolder(conversation.id, dropData.folderId, projectId)
      } else if (dropData.type === 'root') {
        moveConversationToFolder(conversation.id, null, projectId)
      }
    } else if (dragData.type === 'folder') {
      const folder = dragData.item as FolderType
      if (dropData.type === 'folder' && dropData.folderId) {
        // Don't allow moving a folder into itself or its descendants
        if (!isFolderDescendant(folders, folder.id, dropData.folderId)) {
          moveFolder(folder.id, dropData.folderId)
        }
      } else if (dropData.type === 'root') {
        moveFolder(folder.id, null)
      }
    }
  }, [folders, moveConversationToFolder, moveFolder, projectId])

  if (!project) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Project not found</p>
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/projects"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Projects
          </Link>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className="h-6 w-6 rounded-lg"
                style={{ backgroundColor: project.color }}
              />
              <div>
                <h1 className="text-2xl font-semibold">{project.name}</h1>
                {project.description && (
                  <p className="text-muted-foreground">{project.description}</p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => handleCreateFolder()}>
                <FolderPlus className="h-4 w-4 mr-2" />
                New Folder
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/projects/${projectId}/settings`}>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Link>
              </Button>
              <Button size="sm" onClick={() => handleNewChat()}>
                <Plus className="h-4 w-4 mr-2" />
                New Chat
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {/* Folders */}
          {rootFolders.length > 0 && (
            <div>
              <h2 className="text-lg font-medium mb-4">Folders</h2>
              <div className="space-y-2">
                {rootFolders.map((folder) => (
                  <FolderSection
                    key={folder.id}
                    folder={folder}
                    allFolders={folders}
                    conversationsByFolder={conversationsByFolder}
                    onOpenConversation={handleOpenConversation}
                    onNewChat={handleNewChat}
                    onCreateSubfolder={handleCreateFolder}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Unorganized Conversations Drop Zone */}
          <UnorganizedSection
            title={rootFolders.length > 0 ? 'Unorganized Conversations' : 'Conversations'}
            conversations={unorganizedConversations}
            showEmptyState={rootFolders.length === 0}
            onOpenConversation={handleOpenConversation}
            onCreateFolder={() => handleCreateFolder()}
            onNewChat={() => handleNewChat()}
          />
        </div>

        {/* Create Folder Dialog */}
        <CreateFolderDialog
          open={createFolderOpen}
          onOpenChange={setCreateFolderOpen}
          onSubmit={handleSubmitCreateFolder}
          parentFolderName={createFolderParentName}
        />
      </div>

      {/* Drag Overlay */}
      <DragOverlay dropAnimation={null}>
        {activeItem && <DragOverlayItem item={activeItem} />}
      </DragOverlay>
    </DndContext>
  )
}

// Drag Overlay Item
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
          {conversation.pinned && <Pin className="h-3 w-3 text-amber-500" />}
        </div>
        <span className="truncate max-w-[200px]">{conversation.title}</span>
      </div>
    )
  }

  if (item.type === 'folder') {
    const folder = item.data as FolderType
    return (
      <div className="flex items-center gap-2 rounded-md bg-background border shadow-lg px-3 py-2 text-sm">
        <Folder className="h-4 w-4" style={{ color: folder.color ?? undefined }} />
        <span className="truncate max-w-[200px] font-medium">{folder.name}</span>
      </div>
    )
  }

  return null
}

// Unorganized Section with Drop Zone
function UnorganizedSection({
  title,
  conversations,
  showEmptyState,
  onOpenConversation,
  onCreateFolder,
  onNewChat,
}: {
  title: string
  conversations: Conversation[]
  showEmptyState: boolean
  onOpenConversation: (id: string) => void
  onCreateFolder: () => void
  onNewChat: () => void
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'unorganized-drop',
    data: { type: 'root' as const },
  })

  return (
    <div>
      <h2 className="text-lg font-medium mb-4">{title}</h2>
      <div
        ref={setNodeRef}
        className={cn(
          'min-h-[100px] rounded-lg transition-colors',
          isOver && 'ring-2 ring-primary ring-inset bg-primary/5'
        )}
      >
        {conversations.length === 0 && showEmptyState ? (
          <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg">
            <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-1">No conversations yet</h3>
            <p className="text-muted-foreground mb-4">
              Start by creating folders to organize your work, or start a conversation
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onCreateFolder}>
                <FolderPlus className="h-4 w-4 mr-2" />
                Create Folder
              </Button>
              <Button onClick={onNewChat}>
                <Plus className="h-4 w-4 mr-2" />
                Start Conversation
              </Button>
            </div>
          </div>
        ) : conversations.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            All conversations are organized in folders. Drag conversations here to unorganize them.
          </p>
        ) : (
          <div className="space-y-2">
            {conversations.map((conversation) => (
              <ConversationRow
                key={conversation.id}
                conversation={conversation}
                onClick={() => onOpenConversation(conversation.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Folder Section Component
function FolderSection({
  folder,
  allFolders,
  conversationsByFolder,
  onOpenConversation,
  onNewChat,
  onCreateSubfolder,
  depth = 0,
}: {
  folder: FolderType
  allFolders: FolderType[]
  conversationsByFolder: Record<string, Conversation[]>
  onOpenConversation: (id: string) => void
  onNewChat: (folderId?: string) => void
  onCreateSubfolder: (parentId?: string, parentName?: string) => void
  depth?: number
}) {
  const isExpanded = useFolderExpanded(folder.id)
  const { toggleFolderExpanded } = useFolderActions()

  const childFolders = allFolders.filter((f) => f.parentId === folder.id)
  const folderConversations = conversationsByFolder[folder.id] || []
  const hasContent = childFolders.length > 0 || folderConversations.length > 0

  // Draggable hook for the folder
  const {
    attributes: dragAttributes,
    listeners: dragListeners,
    setNodeRef: setDragRef,
    isDragging,
  } = useDraggable({
    id: `folder-${folder.id}`,
    data: { type: 'folder' as const, item: folder },
  })

  // Droppable hook for the folder
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `folder-drop-${folder.id}`,
    data: { type: 'folder' as const, folderId: folder.id },
  })

  // Combine refs
  const setRefs = (node: HTMLDivElement | null) => {
    setDragRef(node)
    setDropRef(node)
  }

  return (
    <div className={cn('border rounded-lg', isDragging && 'opacity-50')}>
      {/* Folder Header */}
      <div
        ref={setRefs}
        className={cn(
          'flex items-center gap-2 p-3 cursor-pointer hover:bg-muted/50 transition-colors',
          isOver && 'ring-2 ring-primary ring-inset bg-primary/10'
        )}
        onClick={() => toggleFolderExpanded(folder.id)}
        {...dragAttributes}
        {...dragListeners}
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 p-0"
          onClick={(e) => {
            e.stopPropagation()
            toggleFolderExpanded(folder.id)
          }}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
        <Folder className="h-4 w-4" style={{ color: folder.color ?? undefined }} />
        <span className="font-medium flex-1">{folder.name}</span>
        <span className="text-sm text-muted-foreground mr-2">
          {folderConversations.length} conversations
          {childFolders.length > 0 && `, ${childFolders.length} subfolders`}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-7"
          onClick={(e) => {
            e.stopPropagation()
            onCreateSubfolder(folder.id, folder.name)
          }}
        >
          <FolderPlus className="h-3.5 w-3.5 mr-1" />
          Subfolder
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7"
          onClick={(e) => {
            e.stopPropagation()
            onNewChat(folder.id)
          }}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Chat
        </Button>
      </div>

      {/* Folder Content */}
      {isExpanded && (
        <div className="border-t">
          {/* Subfolders */}
          {childFolders.length > 0 && (
            <div className="p-2 space-y-2">
              {childFolders.map((childFolder) => (
                <FolderSection
                  key={childFolder.id}
                  folder={childFolder}
                  allFolders={allFolders}
                  conversationsByFolder={conversationsByFolder}
                  onOpenConversation={onOpenConversation}
                  onNewChat={onNewChat}
                  onCreateSubfolder={onCreateSubfolder}
                  depth={depth + 1}
                />
              ))}
            </div>
          )}

          {/* Conversations */}
          {folderConversations.length > 0 && (
            <div className="p-2 space-y-1">
              {folderConversations.map((conversation) => (
                <ConversationRow
                  key={conversation.id}
                  conversation={conversation}
                  onClick={() => onOpenConversation(conversation.id)}
                  compact
                />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!hasContent && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              This folder is empty. Drag conversations here to organize them.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Conversation Row Component
function ConversationRow({
  conversation,
  onClick,
  compact = false,
}: {
  conversation: Conversation
  onClick: () => void
  compact?: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging,
  } = useDraggable({
    id: `conversation-${conversation.id}`,
    data: { type: 'conversation' as const, item: conversation },
  })

  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      className={cn(
        'w-full flex items-center justify-between rounded-lg border hover:bg-muted/50 transition-colors text-left cursor-pointer',
        compact ? 'p-2' : 'p-4',
        isDragging && 'opacity-50'
      )}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          {conversation.parentId ? (
            <GitBranch className={cn('text-muted-foreground', compact ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
          ) : (
            <MessageSquare className={cn('text-muted-foreground', compact ? 'h-4 w-4' : 'h-5 w-5')} />
          )}
          {conversation.pinned && <Pin className="h-3 w-3 text-amber-500" />}
        </div>
        <div>
          <p className={cn('font-medium', compact && 'text-sm')}>{conversation.title}</p>
          {!compact && (
            <p className="text-sm text-muted-foreground">
              {conversation.messageCount} messages
            </p>
          )}
        </div>
      </div>
      <span className="text-sm text-muted-foreground">
        {formatRelativeTime(conversation.lastMessageAt)}
      </span>
    </div>
  )
}
