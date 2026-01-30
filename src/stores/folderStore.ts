import { useMemo } from 'react'
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { Folder, FolderTreeNode } from '@/types'
import { generateId } from '@/lib/utils'

interface FolderState {
  folders: Record<string, Folder>
  expandedFolders: Set<string>
  isLoading: boolean
}

interface FolderActions {
  createFolder: (input: {
    projectId: string
    parentId?: string | null
    name: string
    color?: string | null
    icon?: string | null
  }) => Folder
  updateFolder: (id: string, data: Partial<Folder>) => void
  deleteFolder: (id: string) => void
  moveFolder: (folderId: string, targetParentId: string | null, targetPosition?: number) => void
  toggleFolderExpanded: (id: string) => void
  setFolderExpanded: (id: string, expanded: boolean) => void
  expandAllFolders: (projectId: string) => void
  collapseAllFolders: (projectId: string) => void
  loadFolders: (folders: Folder[]) => void
}

type FolderStore = FolderState & { actions: FolderActions }

export const useFolderStore = create<FolderStore>()(
  devtools(
    persist(
      (set, get) => ({
        folders: {},
        expandedFolders: new Set<string>(),
        isLoading: false,

        actions: {
          createFolder: (input) => {
            const id = `folder-${generateId()}`
            const now = new Date()

            // Calculate depth based on parent
            let depth = 0
            if (input.parentId) {
              const parent = get().folders[input.parentId]
              if (parent) {
                depth = parent.depth + 1
              }
            }

            // Get next position
            const siblings = Object.values(get().folders).filter(
              (f) =>
                f.projectId === input.projectId &&
                (f.parentId === input.parentId || (!f.parentId && !input.parentId))
            )
            const position = siblings.length > 0
              ? Math.max(...siblings.map((f) => f.position)) + 1
              : 0

            const folder: Folder = {
              id,
              projectId: input.projectId,
              parentId: input.parentId ?? null,
              name: input.name,
              color: input.color ?? null,
              icon: input.icon ?? null,
              position,
              depth,
              createdAt: now,
              updatedAt: now,
            }

            set((state) => ({
              folders: { ...state.folders, [id]: folder },
            }))

            // Expand parent if it exists
            if (input.parentId) {
              get().actions.setFolderExpanded(input.parentId, true)
            }

            return folder
          },

          updateFolder: (id, data) => {
            set((state) => {
              const existing = state.folders[id]
              if (!existing) return state

              // If parent changed, recalculate depth
              let depth = existing.depth
              if (data.parentId !== undefined && data.parentId !== existing.parentId) {
                if (data.parentId) {
                  const newParent = state.folders[data.parentId]
                  depth = newParent ? newParent.depth + 1 : 0
                } else {
                  depth = 0
                }
              }

              return {
                folders: {
                  ...state.folders,
                  [id]: {
                    ...existing,
                    ...data,
                    depth,
                    updatedAt: new Date(),
                  },
                },
              }
            })

            // Update depths of descendants if parent changed
            if (data.parentId !== undefined) {
              const updateDescendantDepths = (folderId: string, parentDepth: number) => {
                const children = Object.values(get().folders).filter(
                  (f) => f.parentId === folderId
                )
                for (const child of children) {
                  const newDepth = parentDepth + 1
                  set((state) => ({
                    folders: {
                      ...state.folders,
                      [child.id]: { ...child, depth: newDepth },
                    },
                  }))
                  updateDescendantDepths(child.id, newDepth)
                }
              }

              const updated = get().folders[id]
              if (updated) {
                updateDescendantDepths(id, updated.depth)
              }
            }
          },

          deleteFolder: (id) => {
            // Get all descendant folder IDs to delete
            const getAllDescendantIds = (folderId: string): string[] => {
              const children = Object.values(get().folders).filter(
                (f) => f.parentId === folderId
              )
              const descendantIds = children.map((c) => c.id)
              for (const child of children) {
                descendantIds.push(...getAllDescendantIds(child.id))
              }
              return descendantIds
            }

            const idsToDelete = [id, ...getAllDescendantIds(id)]

            set((state) => {
              const newFolders = { ...state.folders }
              const newExpanded = new Set(state.expandedFolders)

              for (const deleteId of idsToDelete) {
                delete newFolders[deleteId]
                newExpanded.delete(deleteId)
              }

              return {
                folders: newFolders,
                expandedFolders: newExpanded,
              }
            })
          },

          moveFolder: (folderId, targetParentId, targetPosition) => {
            const folder = get().folders[folderId]
            if (!folder) return

            // Prevent moving into self or descendants
            const getAllDescendantIds = (id: string): string[] => {
              const children = Object.values(get().folders).filter(
                (f) => f.parentId === id
              )
              const descendantIds = children.map((c) => c.id)
              for (const child of children) {
                descendantIds.push(...getAllDescendantIds(child.id))
              }
              return descendantIds
            }

            if (targetParentId) {
              const descendants = getAllDescendantIds(folderId)
              if (descendants.includes(targetParentId)) {
                console.error('Cannot move folder into its own descendant')
                return
              }
            }

            // Calculate new position if not provided
            let position = targetPosition ?? 0
            if (targetPosition === undefined) {
              const siblings = Object.values(get().folders).filter(
                (f) =>
                  f.projectId === folder.projectId &&
                  f.parentId === targetParentId &&
                  f.id !== folderId
              )
              position = siblings.length > 0
                ? Math.max(...siblings.map((f) => f.position)) + 1
                : 0
            }

            get().actions.updateFolder(folderId, {
              parentId: targetParentId,
              position,
            })
          },

          toggleFolderExpanded: (id) => {
            set((state) => {
              const newExpanded = new Set(state.expandedFolders)
              if (newExpanded.has(id)) {
                newExpanded.delete(id)
              } else {
                newExpanded.add(id)
              }
              return { expandedFolders: newExpanded }
            })
          },

          setFolderExpanded: (id, expanded) => {
            set((state) => {
              const newExpanded = new Set(state.expandedFolders)
              if (expanded) {
                newExpanded.add(id)
              } else {
                newExpanded.delete(id)
              }
              return { expandedFolders: newExpanded }
            })
          },

          expandAllFolders: (projectId) => {
            const projectFolders = Object.values(get().folders).filter(
              (f) => f.projectId === projectId
            )
            set((state) => {
              const newExpanded = new Set(state.expandedFolders)
              for (const folder of projectFolders) {
                newExpanded.add(folder.id)
              }
              return { expandedFolders: newExpanded }
            })
          },

          collapseAllFolders: (projectId) => {
            const projectFolders = Object.values(get().folders).filter(
              (f) => f.projectId === projectId
            )
            set((state) => {
              const newExpanded = new Set(state.expandedFolders)
              for (const folder of projectFolders) {
                newExpanded.delete(folder.id)
              }
              return { expandedFolders: newExpanded }
            })
          },

          loadFolders: (folders) => {
            const foldersRecord = folders.reduce((acc, folder) => {
              acc[folder.id] = folder
              return acc
            }, {} as Record<string, Folder>)

            set({ folders: foldersRecord })
          },
        },
      }),
      {
        name: 'folder-store',
        partialize: (state) => ({
          // Only persist expandedFolders, not folders themselves
          expandedFolders: Array.from(state.expandedFolders),
        }),
        merge: (persisted, current) => ({
          ...current,
          expandedFolders: new Set((persisted as { expandedFolders?: string[] })?.expandedFolders ?? []),
        }),
      }
    ),
    { name: 'folder-store' }
  )
)

// ============================================================================
// Selector Hooks
// ============================================================================

export const useFolders = (): Folder[] => {
  const folders = useFolderStore((state) => state.folders)
  return useMemo(() => Object.values(folders), [folders])
}

export const useFolderById = (id: string): Folder | undefined => {
  return useFolderStore((state) => state.folders[id])
}

export const useProjectFolders = (projectId: string): Folder[] => {
  const folders = useFolderStore((state) => state.folders)
  return useMemo(
    () =>
      Object.values(folders)
        .filter((f) => f.projectId === projectId)
        .sort((a, b) => a.position - b.position),
    [folders, projectId]
  )
}

export const useRootFolders = (projectId: string): Folder[] => {
  const folders = useFolderStore((state) => state.folders)
  return useMemo(
    () =>
      Object.values(folders)
        .filter((f) => f.projectId === projectId && !f.parentId)
        .sort((a, b) => a.position - b.position),
    [folders, projectId]
  )
}

export const useChildFolders = (parentId: string): Folder[] => {
  const folders = useFolderStore((state) => state.folders)
  return useMemo(
    () =>
      Object.values(folders)
        .filter((f) => f.parentId === parentId)
        .sort((a, b) => a.position - b.position),
    [folders, parentId]
  )
}

export const useFolderExpanded = (id: string): boolean => {
  return useFolderStore((state) => state.expandedFolders.has(id))
}

export const useExpandedFolders = (): Set<string> => {
  return useFolderStore((state) => state.expandedFolders)
}

export const useFolderActions = () => useFolderStore.getState().actions

// ============================================================================
// Tree Building Helpers
// ============================================================================

export function buildFolderTree(
  folders: Folder[],
  conversations: { id: string; folderId?: string | null }[]
): FolderTreeNode[] {
  const folderMap = new Map<string, FolderTreeNode>()
  const expandedFolders = useFolderStore.getState().expandedFolders

  // Build folder-to-conversations map
  const folderConversations = new Map<string, string[]>()
  for (const conv of conversations) {
    if (conv.folderId) {
      const existing = folderConversations.get(conv.folderId) || []
      folderConversations.set(conv.folderId, [...existing, conv.id])
    }
  }

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

export function useFolderTree(
  projectId: string,
  conversations: { id: string; folderId?: string | null }[]
): FolderTreeNode[] {
  const folders = useProjectFolders(projectId)
  const expandedFolders = useExpandedFolders()

  return useMemo(() => {
    const folderMap = new Map<string, FolderTreeNode>()

    // Build folder-to-conversations map
    const folderConversations = new Map<string, string[]>()
    for (const conv of conversations) {
      if (conv.folderId) {
        const existing = folderConversations.get(conv.folderId) || []
        folderConversations.set(conv.folderId, [...existing, conv.id])
      }
    }

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
  }, [folders, conversations, expandedFolders])
}
