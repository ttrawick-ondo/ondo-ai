'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, FolderPlus, MessageSquare, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  useConversations,
  useChatStore,
  useChatActions,
  usePinnedConversations,
  useRecentConversations,
  useFolderActions,
  useFolderStore,
  useChatLoading,
  useConversationsInitialized,
  useActiveWorkspaceId,
  useProjects,
  useProjectsInitialized,
  useProjectActions,
} from '@/stores'
import { buildFolderTree } from '@/stores/folderStore'
import { PinnedSection } from './PinnedSection'
import { ProjectSection } from './ProjectSection'
import { QuickFilters, filterConversationsByQuickFilter } from './QuickFilters'
import { SidebarDndContext } from './SidebarDndContext'
import { SidebarSkeleton } from './SidebarSkeleton'
import { ConversationItem, CreateFolderDialog, MoveConversationDialog } from '@/components/folders'
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog'
import type { QuickFilter } from './QuickFilters'
import type { Conversation, FolderTreeNode } from '@/types'

export function ConversationList() {
  const router = useRouter()
  const activeWorkspaceId = useActiveWorkspaceId()
  const conversations = useConversations(activeWorkspaceId)
  const pinnedConversations = usePinnedConversations(activeWorkspaceId)
  const recentConversations = useRecentConversations(10, activeWorkspaceId)
  const activeConversationId = useChatStore((s) => s.activeConversationId)
  const activeBranchId = useChatStore((s) => s.activeBranchId)
  // When viewing a branch, highlight it instead of the parent
  const selectedConversationId = activeBranchId ?? activeConversationId
  const isLoading = useChatLoading()
  const isInitialized = useConversationsInitialized()
  const {
    setActiveConversation,
    createConversation,
    deleteConversation,
    updateConversationTitle,
    toggleConversationPinned,
    moveConversationToFolder,
  } = useChatActions()
  const { createFolder, deleteFolder, moveFolder, fetchProjectFolders } = useFolderActions()
  const { deleteProject } = useProjectActions()

  // Project & folder data
  const projects = useProjects(activeWorkspaceId)
  const isProjectsInitialized = useProjectsInitialized()
  // Subscribe to folder store reactively so useMemo recomputes when folders load
  const foldersRecord = useFolderStore((s) => s.folders)
  const expandedFolders = useFolderStore((s) => s.expandedFolders)

  // Fetch folders for each project once projects are loaded
  useEffect(() => {
    if (!isProjectsInitialized || projects.length === 0) return
    for (const project of projects) {
      fetchProjectFolders(project.id)
    }
  }, [isProjectsInitialized, projects, fetchProjectFolders])

  // Local state
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all')
  const [createFolderDialogOpen, setCreateFolderDialogOpen] = useState(false)
  const [createFolderParent, setCreateFolderParent] = useState<{
    projectId?: string
    parentId?: string
    parentName?: string
  } | null>(null)
  const [moveConversationDialogOpen, setMoveConversationDialogOpen] = useState(false)
  const [conversationToMove, setConversationToMove] = useState<Conversation | null>(null)

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<{
    id: string
    name: string
    type: 'conversation' | 'folder' | 'project'
  } | null>(null)

  // Keyboard navigation state
  const [focusedConversationId, setFocusedConversationId] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Build conversations record for FolderTree / ProjectSection
  const conversationsRecord = useMemo(() => {
    return conversations.reduce((acc, conv) => {
      acc[conv.id] = conv
      return acc
    }, {} as Record<string, Conversation>)
  }, [conversations])

  // Build parent-to-branches map
  const branchesByParent = useMemo(() => {
    const map: Record<string, Conversation[]> = {}
    for (const conv of conversations) {
      if (conv.parentId) {
        if (!map[conv.parentId]) map[conv.parentId] = []
        map[conv.parentId].push(conv)
      }
    }
    // Sort branches by lastMessageAt descending
    for (const parentId of Object.keys(map)) {
      map[parentId].sort(
        (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
      )
    }
    return map
  }, [conversations])

  // Filter conversations based on quick filter
  const filteredConversations = useMemo(() => {
    return filterConversationsByQuickFilter(conversations, quickFilter)
  }, [conversations, quickFilter])

  // Build folder trees per project
  const foldersByProject = useMemo(() => {
    const result: Record<string, FolderTreeNode[]> = {}
    const allFolders = Object.values(foldersRecord)
    for (const project of projects) {
      const projectFolders = allFolders.filter((f) => f.projectId === project.id)
      result[project.id] = buildFolderTree(projectFolders, conversations)
    }
    return result
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, foldersRecord, conversations, expandedFolders])

  // Unorganized conversations per project (in project but not in any folder)
  const unorganizedByProject = useMemo(() => {
    const result: Record<string, Conversation[]> = {}
    for (const project of projects) {
      result[project.id] = conversations.filter(
        (c) => c.projectId === project.id && !c.folderId && !c.parentId
      )
    }
    return result
  }, [projects, conversations])

  // Build folder nodes record for DnD context (across all projects)
  const folderNodesRecord = useMemo(() => {
    const result: Record<string, FolderTreeNode> = {}
    const addFolderNodes = (nodes: FolderTreeNode[]) => {
      for (const node of nodes) {
        result[node.id] = node
        addFolderNodes(node.children)
      }
    }
    for (const projectId of Object.keys(foldersByProject)) {
      addFolderNodes(foldersByProject[projectId])
    }
    return result
  }, [foldersByProject])

  // Handlers
  const handleSelectConversation = useCallback(
    (id: string) => {
      const conv = conversationsRecord[id]
      // If selecting a branch, navigate to its parent with the branch tab selected
      if (conv?.parentId) {
        setActiveConversation(conv.parentId, id)
        router.push(`/chat/${conv.parentId}?branch=${id}`)
      } else {
        setActiveConversation(id)
        router.push(`/chat/${id}`)
      }
    },
    [setActiveConversation, router, conversationsRecord]
  )

  const handleDeleteConversation = useCallback(
    (id: string) => {
      const conv = conversationsRecord[id]
      setItemToDelete({
        id,
        name: conv?.title || 'conversation',
        type: 'conversation',
      })
      setDeleteDialogOpen(true)
    },
    [conversationsRecord]
  )

  const handleRenameConversation = useCallback(
    (id: string, newTitle: string) => {
      updateConversationTitle(id, newTitle)
    },
    [updateConversationTitle]
  )

  const handleConfirmDelete = useCallback(() => {
    if (!itemToDelete) return

    if (itemToDelete.type === 'conversation') {
      deleteConversation(itemToDelete.id)
      if (activeConversationId === itemToDelete.id) {
        router.push('/chat')
      }
    } else if (itemToDelete.type === 'folder') {
      deleteFolder(itemToDelete.id)
    } else if (itemToDelete.type === 'project') {
      deleteProject(itemToDelete.id)
    }
    setItemToDelete(null)
  }, [itemToDelete, deleteConversation, deleteFolder, deleteProject, activeConversationId, router])

  const handlePinConversation = useCallback(
    (id: string) => {
      toggleConversationPinned(id)
    },
    [toggleConversationPinned]
  )

  const handleMoveConversation = useCallback(
    (id: string) => {
      const conv = conversationsRecord[id]
      if (conv) {
        setConversationToMove(conv)
        setMoveConversationDialogOpen(true)
      }
    },
    [conversationsRecord]
  )

  const handleCreateFolder = useCallback(
    (projectId: string, parentId?: string) => {
      const parentFolder = parentId ? useFolderStore.getState().folders[parentId] : null
      setCreateFolderParent({
        projectId,
        parentId,
        parentName: parentFolder?.name,
      })
      setCreateFolderDialogOpen(true)
    },
    []
  )

  const handleSubmitCreateFolder = useCallback(
    (data: { name: string; color: string | null }) => {
      createFolder({
        projectId: createFolderParent?.projectId ?? '',
        parentId: createFolderParent?.parentId ?? null,
        name: data.name,
        color: data.color,
      })
    },
    [createFolder, createFolderParent]
  )

  const handleCreateConversationInProject = useCallback(
    async (projectId: string, folderId?: string) => {
      const id = await createConversation('New conversation', projectId, undefined, folderId || null, activeWorkspaceId)
      setActiveConversation(id)
      router.push(`/chat/${id}`)
    },
    [createConversation, setActiveConversation, router, activeWorkspaceId]
  )

  const handleSubmitMoveConversation = useCallback(
    (projectId: string | null, folderId: string | null) => {
      if (!conversationToMove) return
      moveConversationToFolder(conversationToMove.id, folderId, projectId)
    },
    [moveConversationToFolder, conversationToMove]
  )

  // Drag and drop handlers
  const handleDndMoveConversation = useCallback(
    (conversationId: string, targetFolderId: string | null, targetProjectId?: string | null) => {
      moveConversationToFolder(conversationId, targetFolderId, targetProjectId ?? null)
    },
    [moveConversationToFolder]
  )

  const handleDndMoveFolder = useCallback(
    (folderId: string, targetParentId: string | null) => {
      moveFolder(folderId, targetParentId)
    },
    [moveFolder]
  )

  const handleDeleteFolder = useCallback(
    (id: string) => {
      const folder = useFolderStore.getState().folders[id]
      setItemToDelete({
        id,
        name: folder?.name || 'folder',
        type: 'folder',
      })
      setDeleteDialogOpen(true)
    },
    []
  )

  const handleDeleteProject = useCallback(
    (id: string) => {
      const project = projects.find((p) => p.id === id)
      setItemToDelete({
        id,
        name: project?.name || 'folder',
        type: 'project',
      })
      setDeleteDialogOpen(true)
    },
    [projects]
  )

  // Filtered pinned and recent for quick filter
  const filteredPinned = useMemo(() => {
    return pinnedConversations.filter((c) => !c.parentId)
  }, [pinnedConversations])

  // Recent: only conversations NOT in any project (those appear under ProjectSection)
  const filteredRecent = useMemo(() => {
    const result = recentConversations.filter((c) => !c.parentId && !c.projectId)
    return filterConversationsByQuickFilter(result, quickFilter)
  }, [recentConversations, quickFilter])

  // Build flat list of visible conversation IDs for keyboard navigation
  const visibleConversationIds = useMemo(() => {
    const ids: string[] = []

    // Add pinned conversations
    filteredPinned.forEach((c) => ids.push(c.id))

    // Add recent conversations
    filteredRecent.forEach((c) => ids.push(c.id))

    return ids
  }, [filteredPinned, filteredRecent])

  // Keyboard navigation handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if sidebar is focused or no input is focused
      const activeElement = document.activeElement
      const isInputFocused = activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA'
      if (isInputFocused) return

      // Only handle navigation keys
      if (!['ArrowUp', 'ArrowDown', 'j', 'k', 'Enter'].includes(e.key)) return

      const currentIndex = focusedConversationId
        ? visibleConversationIds.indexOf(focusedConversationId)
        : -1

      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault()
        const nextIndex = currentIndex < visibleConversationIds.length - 1 ? currentIndex + 1 : 0
        setFocusedConversationId(visibleConversationIds[nextIndex])
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault()
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : visibleConversationIds.length - 1
        setFocusedConversationId(visibleConversationIds[prevIndex])
      } else if (e.key === 'Enter' && focusedConversationId) {
        e.preventDefault()
        handleSelectConversation(focusedConversationId)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [focusedConversationId, visibleConversationIds, handleSelectConversation])

  // Sync focused conversation with selected conversation
  useEffect(() => {
    if (selectedConversationId && visibleConversationIds.includes(selectedConversationId)) {
      setFocusedConversationId(selectedConversationId)
    }
  }, [selectedConversationId, visibleConversationIds])

  // Loading state
  if (isLoading && !isInitialized) {
    return <SidebarSkeleton showPinned={false} projectCount={0} conversationCount={4} />
  }

  // Empty state
  if (conversations.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex flex-col items-center justify-center flex-1 p-6 text-center">
          <div className="rounded-full bg-muted p-3 mb-3">
            <MessageSquare className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium mb-1">No conversations yet</p>
          <p className="text-xs text-muted-foreground mb-4">
            Start chatting to see your conversations here
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              const id = await createConversation('New conversation', undefined, undefined, null, activeWorkspaceId)
              router.push(`/chat/${id}`)
            }}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            New Conversation
          </Button>
        </div>
      </div>
    )
  }

  return (
    <SidebarDndContext
      conversations={conversationsRecord}
      folders={folderNodesRecord}
      onMoveConversation={handleDndMoveConversation}
      onMoveFolder={handleDndMoveFolder}
    >
      <div className="flex flex-col h-full">
        {/* Quick Filters */}
        <QuickFilters
          activeFilter={quickFilter}
          onFilterChange={setQuickFilter}
          className="px-2 pb-2"
        />

        <Separator />

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {/* Pinned Section */}
          {filteredPinned.length > 0 && (
            <>
              <div className="p-2">
                <PinnedSection
                  conversations={filteredPinned}
                  branchesByParent={branchesByParent}
                  selectedConversationId={selectedConversationId}
                  focusedConversationId={focusedConversationId}
                  onSelectConversation={handleSelectConversation}
                  onRenameConversation={handleRenameConversation}
                  onDeleteConversation={handleDeleteConversation}
                  onPinConversation={handlePinConversation}
                  onMoveConversation={handleMoveConversation}
                />
              </div>
              <Separator />
            </>
          )}

          {/* Folders Section (Project-based organization) */}
          {projects.length > 0 && (
            <div className="p-2">
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                <span>Folders</span>
              </div>
              {projects.map((project) => (
                <ProjectSection
                  key={project.id}
                  project={project}
                  folders={foldersByProject[project.id] || []}
                  conversations={conversationsRecord}
                  unorganizedConversations={unorganizedByProject[project.id] || []}
                  branchesByParent={branchesByParent}
                  selectedConversationId={selectedConversationId}
                  onSelectConversation={handleSelectConversation}
                  onCreateFolder={handleCreateFolder}
                  onCreateConversation={handleCreateConversationInProject}
                  onDeleteFolder={handleDeleteFolder}
                  onRenameConversation={handleRenameConversation}
                  onDeleteConversation={handleDeleteConversation}
                  onPinConversation={handlePinConversation}
                  onMoveConversation={handleMoveConversation}
                  onEditProject={(id) => router.push(`/projects/${id}/settings`)}
                  onDeleteProject={handleDeleteProject}
                  defaultExpanded={projects.length === 1}
                  enableDragDrop={true}
                />
              ))}
            </div>
          )}

          {projects.length > 0 && filteredRecent.length > 0 && <Separator />}

          {/* Recent Conversations (not in any project/folder) */}
          {filteredRecent.length > 0 && (
            <div className="p-2">
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                <span>Recent</span>
              </div>
              <div className="flex flex-col gap-0.5">
                {filteredRecent.map((conv) => (
                  <ConversationItem
                    key={conv.id}
                    conversation={conv}
                    depth={0}
                    isSelected={conv.id === selectedConversationId}
                    isFocused={conv.id === focusedConversationId}
                    onSelect={() => handleSelectConversation(conv.id)}
                    onRename={handleRenameConversation}
                    onRenameConversation={handleRenameConversation}
                    onDelete={() => handleDeleteConversation(conv.id)}
                    onPin={() => handlePinConversation(conv.id)}
                    onMove={() => handleMoveConversation(conv.id)}
                    branches={branchesByParent[conv.id]}
                    selectedConversationId={selectedConversationId}
                    onSelectConversation={handleSelectConversation}
                    onDeleteConversation={handleDeleteConversation}
                    onPinConversation={handlePinConversation}
                    onMoveConversation={handleMoveConversation}
                    enableDragDrop={true}
                  />
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Create Folder Dialog */}
        <CreateFolderDialog
          open={createFolderDialogOpen}
          onOpenChange={setCreateFolderDialogOpen}
          onSubmit={handleSubmitCreateFolder}
          parentFolderName={createFolderParent?.parentName}
        />

        {/* Move Conversation Dialog */}
        {conversationToMove && (
          <MoveConversationDialog
            open={moveConversationDialogOpen}
            onOpenChange={setMoveConversationDialogOpen}
            onSubmit={handleSubmitMoveConversation}
            conversationTitle={conversationToMove.title}
            projects={projects}
            foldersByProject={foldersByProject}
            currentProjectId={conversationToMove.projectId}
            currentFolderId={conversationToMove.folderId}
          />
        )}

        {/* Delete Confirmation Dialog */}
        <ConfirmDeleteDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={handleConfirmDelete}
          itemName={itemToDelete?.name}
          itemType={itemToDelete?.type}
        />
      </div>
    </SidebarDndContext>
  )
}
