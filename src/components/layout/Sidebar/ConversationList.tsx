'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, FolderPlus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  useConversations,
  useChatStore,
  useChatActions,
  usePinnedConversations,
  useRecentConversations,
  useProjects,
  useFolderTree,
  useFolderActions,
  useProjectFolders,
  useConversationsByProject,
} from '@/stores'
import { SearchBar } from './SearchBar'
import { PinnedSection } from './PinnedSection'
import { QuickFilters, filterConversationsByQuickFilter } from './QuickFilters'
import { ProjectSection } from './ProjectSection'
import { SidebarDndContext } from './SidebarDndContext'
import { ConversationItem, CreateFolderDialog, MoveConversationDialog } from '@/components/folders'
import type { QuickFilter } from './QuickFilters'
import type { Conversation, FolderTreeNode } from '@/types'

export function ConversationList() {
  const router = useRouter()
  const conversations = useConversations()
  const pinnedConversations = usePinnedConversations()
  const recentConversations = useRecentConversations(10)
  const projects = useProjects()
  const activeConversationId = useChatStore((s) => s.activeConversationId)
  const {
    setActiveConversation,
    deleteConversation,
    toggleConversationPinned,
    moveConversationToFolder,
  } = useChatActions()
  const { createFolder, deleteFolder, moveFolder } = useFolderActions()

  // Local state
  const [searchQuery, setSearchQuery] = useState('')
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all')
  const [createFolderDialogOpen, setCreateFolderDialogOpen] = useState(false)
  const [createFolderParent, setCreateFolderParent] = useState<{
    projectId: string
    parentId?: string
    parentName?: string
  } | null>(null)
  const [moveConversationDialogOpen, setMoveConversationDialogOpen] = useState(false)
  const [conversationToMove, setConversationToMove] = useState<Conversation | null>(null)

  // Build conversations record for FolderTree
  const conversationsRecord = useMemo(() => {
    return conversations.reduce((acc, conv) => {
      acc[conv.id] = conv
      return acc
    }, {} as Record<string, Conversation>)
  }, [conversations])

  // Filter conversations based on search and quick filter
  const filteredConversations = useMemo(() => {
    let result = conversations

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter((conv) =>
        conv.title.toLowerCase().includes(query)
      )
    }

    // Apply quick filter
    result = filterConversationsByQuickFilter(result, quickFilter)

    return result
  }, [conversations, searchQuery, quickFilter])

  // Build folder trees per project
  const foldersByProject = useMemo(() => {
    const result: Record<string, FolderTreeNode[]> = {}
    for (const project of projects) {
      const projectConversations = conversations.filter(
        (c) => c.projectId === project.id
      )
      result[project.id] = buildFolderTreeForProject(project.id, projectConversations)
    }
    return result
  }, [projects, conversations])

  // Get unorganized conversations per project
  const unorganizedByProject = useMemo(() => {
    const result: Record<string, Conversation[]> = {}
    for (const project of projects) {
      result[project.id] = filteredConversations
        .filter((c) => c.projectId === project.id && !c.folderId)
        .sort(
          (a, b) =>
            new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
        )
    }
    return result
  }, [projects, filteredConversations])

  // Handlers
  const handleSelectConversation = useCallback(
    (id: string) => {
      setActiveConversation(id)
      router.push(`/chat/${id}`)
    },
    [setActiveConversation, router]
  )

  const handleDeleteConversation = useCallback(
    (id: string) => {
      deleteConversation(id)
      if (activeConversationId === id) {
        router.push('/chat')
      }
    },
    [deleteConversation, activeConversationId, router]
  )

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

  const { createConversation } = useChatActions()
  const handleCreateConversation = useCallback(
    (projectId: string, folderId?: string) => {
      const id = createConversation('New conversation', projectId, undefined, folderId || null)
      router.push(`/chat/${id}`)
    },
    [router, createConversation]
  )

  const handleSubmitCreateFolder = useCallback(
    (data: { name: string; color: string | null }) => {
      if (!createFolderParent) return

      createFolder({
        projectId: createFolderParent.projectId,
        parentId: createFolderParent.parentId ?? null,
        name: data.name,
        color: data.color,
      })
    },
    [createFolder, createFolderParent]
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

  // Build folder nodes record for DnD context
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

  const handleDeleteFolder = useCallback(
    (id: string) => {
      deleteFolder(id)
    },
    [deleteFolder]
  )

  // Filtered pinned and recent for quick filter
  const filteredPinned = useMemo(() => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return pinnedConversations.filter((c) =>
        c.title.toLowerCase().includes(query)
      )
    }
    return pinnedConversations
  }, [pinnedConversations, searchQuery])

  const filteredRecent = useMemo(() => {
    let result = recentConversations

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter((c) => c.title.toLowerCase().includes(query))
    }

    return filterConversationsByQuickFilter(result, quickFilter)
  }, [recentConversations, searchQuery, quickFilter])

  // Empty state
  if (conversations.length === 0 && !searchQuery) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-2">
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
        </div>
        <div className="p-4 text-center text-sm text-muted-foreground">
          No conversations yet.
          <br />
          Start a new chat!
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
        {/* Search */}
        <div className="p-2">
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
        </div>

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
                  selectedConversationId={activeConversationId}
                  onSelectConversation={handleSelectConversation}
                  onDeleteConversation={handleDeleteConversation}
                  onPinConversation={handlePinConversation}
                  onMoveConversation={handleMoveConversation}
                />
              </div>
              <Separator />
            </>
          )}

          {/* Projects Section */}
          {projects.length > 0 && (
            <div className="p-2">
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground flex items-center justify-between">
                <span>Projects</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  title="New project"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
              {projects.map((project) => (
                <ProjectSection
                  key={project.id}
                  project={project}
                  folders={foldersByProject[project.id] || []}
                  conversations={conversationsRecord}
                  unorganizedConversations={unorganizedByProject[project.id] || []}
                  selectedConversationId={activeConversationId}
                  onSelectConversation={handleSelectConversation}
                  onCreateFolder={handleCreateFolder}
                  onCreateConversation={handleCreateConversation}
                  onDeleteFolder={handleDeleteFolder}
                  onDeleteConversation={handleDeleteConversation}
                  onPinConversation={handlePinConversation}
                  onMoveConversation={handleMoveConversation}
                  enableDragDrop={true}
                />
              ))}
            </div>
          )}

          {projects.length > 0 && filteredRecent.length > 0 && <Separator />}

          {/* Recent Conversations (no project) */}
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
                    isSelected={conv.id === activeConversationId}
                    onSelect={() => handleSelectConversation(conv.id)}
                    onDelete={() => handleDeleteConversation(conv.id)}
                    onPin={() => handlePinConversation(conv.id)}
                    onMove={() => handleMoveConversation(conv.id)}
                    enableDragDrop={true}
                  />
                ))}
              </div>
            </div>
          )}

          {/* No results */}
          {searchQuery && filteredConversations.length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No conversations match your search.
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
      </div>
    </SidebarDndContext>
  )
}

// Import useFolderStore for the callback
import { useFolderStore } from '@/stores'

// Helper to build folder tree for a project
function buildFolderTreeForProject(
  projectId: string,
  conversations: Conversation[]
): FolderTreeNode[] {
  const folders = Object.values(useFolderStore.getState().folders).filter(
    (f) => f.projectId === projectId
  )
  const expandedFolders = useFolderStore.getState().expandedFolders

  // Build folder-to-conversations map
  const folderConversations = new Map<string, string[]>()
  for (const conv of conversations) {
    if (conv.folderId) {
      const existing = folderConversations.get(conv.folderId) || []
      folderConversations.set(conv.folderId, [...existing, conv.id])
    }
  }

  const folderMap = new Map<string, FolderTreeNode>()

  // Create all nodes
  for (const folder of folders) {
    folderMap.set(folder.id, {
      ...folder,
      children: [],
      conversations: folderConversations.get(folder.id) || [],
      isExpanded: expandedFolders.has(folder.id),
    })
  }

  // Build hierarchy
  const rootFolders: FolderTreeNode[] = []
  for (const folder of folders) {
    const node = folderMap.get(folder.id)!
    if (folder.parentId && folderMap.has(folder.parentId)) {
      folderMap.get(folder.parentId)!.children.push(node)
    } else {
      rootFolders.push(node)
    }
  }

  // Sort children by position
  const sortChildren = (nodes: FolderTreeNode[]) => {
    nodes.sort((a, b) => a.position - b.position)
    for (const node of nodes) {
      sortChildren(node.children)
    }
  }
  sortChildren(rootFolders)

  return rootFolders
}
