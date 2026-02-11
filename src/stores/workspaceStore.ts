import { useMemo } from 'react'
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { toast } from 'sonner'
import type { Workspace, WorkspaceMember, CreateWorkspaceInput, UpdateWorkspaceInput, WorkspaceRole } from '@/types'
import { workspaceApi } from '@/lib/api/client/workspaces'

interface WorkspaceState {
  workspaces: Record<string, Workspace>
  activeWorkspaceId: string | null
  membersByWorkspace: Record<string, WorkspaceMember[]>
  isLoading: boolean
  isSyncing: boolean
  isInitialized: boolean
}

interface WorkspaceActions {
  setActiveWorkspace: (id: string | null) => void
  createWorkspace: (input: CreateWorkspaceInput) => Promise<Workspace>
  updateWorkspace: (id: string, input: UpdateWorkspaceInput) => Promise<void>
  deleteWorkspace: (id: string) => Promise<void>
  inviteMember: (workspaceId: string, email: string, role: WorkspaceRole) => Promise<void>
  updateMemberRole: (workspaceId: string, userId: string, role: WorkspaceRole) => Promise<void>
  removeMember: (workspaceId: string, userId: string) => Promise<void>
  loadWorkspaces: (userId: string) => Promise<void>
  loadWorkspaceMembers: (workspaceId: string) => Promise<void>
}

type WorkspaceStore = WorkspaceState & { actions: WorkspaceActions }

export const useWorkspaceStore = create<WorkspaceStore>()(
  devtools(
    persist(
      (set, get) => ({
        workspaces: {},
        activeWorkspaceId: null,
        membersByWorkspace: {},
        isLoading: false,
        isSyncing: false,
        isInitialized: false,

        actions: {
          setActiveWorkspace: (id) => {
            set({ activeWorkspaceId: id })
          },

          createWorkspace: async (input) => {
            set({ isSyncing: true })

            try {
              const workspace = await workspaceApi.createWorkspace({
                name: input.name,
                description: input.description,
                ownerId: 'user-1', // TODO: Get from auth
              })

              set((state) => ({
                workspaces: { ...state.workspaces, [workspace.id]: workspace },
                isSyncing: false,
              }))

              return workspace
            } catch (error) {
              set({ isSyncing: false })
              const message = error instanceof Error ? error.message : 'Failed to create workspace'
              toast.error(message)
              throw error
            }
          },

          updateWorkspace: async (id, input) => {
            const existing = get().workspaces[id]
            if (!existing) return

            // Optimistic update
            set((state) => ({
              workspaces: {
                ...state.workspaces,
                [id]: { ...existing, ...input, updatedAt: new Date() },
              },
              isSyncing: true,
            }))

            try {
              await workspaceApi.updateWorkspace(id, input)
              set({ isSyncing: false })
            } catch (error) {
              // Rollback
              set((state) => ({
                workspaces: { ...state.workspaces, [id]: existing },
                isSyncing: false,
              }))
              const message = error instanceof Error ? error.message : 'Failed to update workspace'
              toast.error(message)
              throw error
            }
          },

          deleteWorkspace: async (id) => {
            const existing = get().workspaces[id]
            const existingMembers = get().membersByWorkspace[id]
            if (!existing) return

            // Optimistic delete
            set((state) => {
              const { [id]: _, ...workspaces } = state.workspaces
              const { [id]: __, ...membersByWorkspace } = state.membersByWorkspace
              return {
                workspaces,
                membersByWorkspace,
                activeWorkspaceId: state.activeWorkspaceId === id ? null : state.activeWorkspaceId,
                isSyncing: true,
              }
            })

            try {
              await workspaceApi.deleteWorkspace(id)
              set({ isSyncing: false })
            } catch (error) {
              // Rollback
              set((state) => ({
                workspaces: { ...state.workspaces, [id]: existing },
                membersByWorkspace: { ...state.membersByWorkspace, [id]: existingMembers || [] },
                isSyncing: false,
              }))
              const message = error instanceof Error ? error.message : 'Failed to delete workspace'
              toast.error(message)
              throw error
            }
          },

          inviteMember: async (workspaceId, _email, role) => {
            // TODO: Implement invitation system with email
            // For now, this is a placeholder - real implementation would:
            // 1. Call API to create invitation
            // 2. Send email to invitee
            // 3. Update UI when invitation is accepted
            toast.info('Invitation system coming soon')
          },

          updateMemberRole: async (workspaceId, userId, role) => {
            const members = get().membersByWorkspace[workspaceId] || []
            const existingMember = members.find((m) => m.userId === userId)
            if (!existingMember) return

            // Optimistic update
            set((state) => ({
              membersByWorkspace: {
                ...state.membersByWorkspace,
                [workspaceId]: members.map((m) =>
                  m.userId === userId ? { ...m, role } : m
                ),
              },
              isSyncing: true,
            }))

            try {
              await workspaceApi.updateMemberRole(workspaceId, userId, role)
              set({ isSyncing: false })
            } catch (error) {
              // Rollback
              set((state) => ({
                membersByWorkspace: {
                  ...state.membersByWorkspace,
                  [workspaceId]: members,
                },
                isSyncing: false,
              }))
              const message = error instanceof Error ? error.message : 'Failed to update member role'
              toast.error(message)
              throw error
            }
          },

          removeMember: async (workspaceId, userId) => {
            const members = get().membersByWorkspace[workspaceId] || []
            const workspace = get().workspaces[workspaceId]

            // Optimistic update
            set((state) => ({
              membersByWorkspace: {
                ...state.membersByWorkspace,
                [workspaceId]: members.filter((m) => m.userId !== userId),
              },
              workspaces: workspace
                ? {
                    ...state.workspaces,
                    [workspaceId]: {
                      ...workspace,
                      memberCount: workspace.memberCount - 1,
                    },
                  }
                : state.workspaces,
              isSyncing: true,
            }))

            try {
              await workspaceApi.removeMember(workspaceId, userId)
              set({ isSyncing: false })
            } catch (error) {
              // Rollback
              set((state) => ({
                membersByWorkspace: {
                  ...state.membersByWorkspace,
                  [workspaceId]: members,
                },
                workspaces: workspace
                  ? { ...state.workspaces, [workspaceId]: workspace }
                  : state.workspaces,
                isSyncing: false,
              }))
              const message = error instanceof Error ? error.message : 'Failed to remove member'
              toast.error(message)
              throw error
            }
          },

          loadWorkspaces: async (userId) => {
            set({ isLoading: true })
            try {
              const workspaces = await workspaceApi.getUserWorkspaces(userId)

              const workspacesRecord = workspaces.reduce((acc, ws) => {
                acc[ws.id] = ws
                return acc
              }, {} as Record<string, Workspace>)

              set({
                workspaces: workspacesRecord,
                isLoading: false,
                isInitialized: true,
                // Set first workspace as active if none selected
                activeWorkspaceId: get().activeWorkspaceId || workspaces[0]?.id || null,
              })
            } catch (error) {
              set({ isLoading: false })
              const message = error instanceof Error ? error.message : 'Failed to load workspaces'
              toast.error(message)
            }
          },

          loadWorkspaceMembers: async (workspaceId) => {
            try {
              const members = await workspaceApi.getMembers(workspaceId)

              set((state) => ({
                membersByWorkspace: {
                  ...state.membersByWorkspace,
                  [workspaceId]: members,
                },
              }))
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Failed to load members'
              toast.error(message)
            }
          },
        },
      }),
      {
        name: 'workspace-store',
        partialize: (state) => ({
          // Only persist the active workspace ID
          activeWorkspaceId: state.activeWorkspaceId,
        }),
      }
    ),
    { name: 'workspace-store' }
  )
)

// Selector hooks
export const useWorkspaces = (): Workspace[] => {
  const workspaces = useWorkspaceStore((state) => state.workspaces)
  return useMemo(() => Object.values(workspaces), [workspaces])
}

export const useActiveWorkspace = () =>
  useWorkspaceStore((state) =>
    state.activeWorkspaceId ? state.workspaces[state.activeWorkspaceId] : null
  )

export const useWorkspaceById = (id: string) =>
  useWorkspaceStore((state) => state.workspaces[id])

const EMPTY_MEMBERS: import('@/types').WorkspaceMember[] = []
export const useWorkspaceMembers = (workspaceId: string) =>
  useWorkspaceStore((state) => state.membersByWorkspace[workspaceId] ?? EMPTY_MEMBERS)

export const useWorkspaceActions = () => useWorkspaceStore.getState().actions
