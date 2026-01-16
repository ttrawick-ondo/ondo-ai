import { useMemo } from 'react'
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { Workspace, WorkspaceMember, CreateWorkspaceInput, UpdateWorkspaceInput, WorkspaceRole } from '@/types'
import { mockWorkspaces, mockWorkspaceMembers, mockUsers } from '@/lib/mocks/data'
import { generateId } from '@/lib/utils'

interface WorkspaceState {
  workspaces: Record<string, Workspace>
  activeWorkspaceId: string | null
  membersByWorkspace: Record<string, WorkspaceMember[]>
  isLoading: boolean
}

interface WorkspaceActions {
  setActiveWorkspace: (id: string | null) => void
  createWorkspace: (input: CreateWorkspaceInput) => Workspace
  updateWorkspace: (id: string, input: UpdateWorkspaceInput) => void
  deleteWorkspace: (id: string) => void
  inviteMember: (workspaceId: string, email: string, role: WorkspaceRole) => void
  updateMemberRole: (workspaceId: string, memberId: string, role: WorkspaceRole) => void
  removeMember: (workspaceId: string, memberId: string) => void
  loadWorkspaces: () => void
}

type WorkspaceStore = WorkspaceState & { actions: WorkspaceActions }

// Convert arrays to records
const workspacesRecord = mockWorkspaces.reduce((acc, ws) => {
  acc[ws.id] = ws
  return acc
}, {} as Record<string, Workspace>)

const membersByWorkspaceRecord = mockWorkspaceMembers.reduce((acc, member) => {
  if (!acc[member.workspaceId]) {
    acc[member.workspaceId] = []
  }
  acc[member.workspaceId].push(member)
  return acc
}, {} as Record<string, WorkspaceMember[]>)

export const useWorkspaceStore = create<WorkspaceStore>()(
  devtools(
    (set, get) => ({
      workspaces: workspacesRecord,
      activeWorkspaceId: 'ws-1', // Default to Engineering workspace
      membersByWorkspace: membersByWorkspaceRecord,
      isLoading: false,

      actions: {
        setActiveWorkspace: (id) => {
          set({ activeWorkspaceId: id })
        },

        createWorkspace: (input) => {
          const id = `ws-${generateId()}`
          const now = new Date()

          const workspace: Workspace = {
            id,
            name: input.name,
            description: input.description,
            ownerId: 'user-1',
            memberCount: 1,
            createdAt: now,
            updatedAt: now,
          }

          // Create owner membership
          const ownerMember: WorkspaceMember = {
            id: `wm-${generateId()}`,
            workspaceId: id,
            userId: 'user-1',
            user: mockUsers[0],
            role: 'owner',
            joinedAt: now,
          }

          set((state) => ({
            workspaces: { ...state.workspaces, [id]: workspace },
            membersByWorkspace: {
              ...state.membersByWorkspace,
              [id]: [ownerMember],
            },
          }))

          return workspace
        },

        updateWorkspace: (id, input) => {
          set((state) => ({
            workspaces: {
              ...state.workspaces,
              [id]: {
                ...state.workspaces[id],
                ...input,
                updatedAt: new Date(),
              },
            },
          }))
        },

        deleteWorkspace: (id) => {
          set((state) => {
            const { [id]: _, ...workspaces } = state.workspaces
            const { [id]: __, ...membersByWorkspace } = state.membersByWorkspace
            return {
              workspaces,
              membersByWorkspace,
              activeWorkspaceId: state.activeWorkspaceId === id ? null : state.activeWorkspaceId,
            }
          })
        },

        inviteMember: (workspaceId, email, role) => {
          // In a real app, this would send an invitation
          // For mock, we'll just add a placeholder member
          const newMember: WorkspaceMember = {
            id: `wm-${generateId()}`,
            workspaceId,
            userId: `user-${generateId()}`,
            user: {
              id: `user-${generateId()}`,
              email,
              name: email.split('@')[0],
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            role,
            joinedAt: new Date(),
          }

          set((state) => ({
            membersByWorkspace: {
              ...state.membersByWorkspace,
              [workspaceId]: [...(state.membersByWorkspace[workspaceId] || []), newMember],
            },
            workspaces: {
              ...state.workspaces,
              [workspaceId]: {
                ...state.workspaces[workspaceId],
                memberCount: state.workspaces[workspaceId].memberCount + 1,
              },
            },
          }))
        },

        updateMemberRole: (workspaceId, memberId, role) => {
          set((state) => ({
            membersByWorkspace: {
              ...state.membersByWorkspace,
              [workspaceId]: state.membersByWorkspace[workspaceId].map((m) =>
                m.id === memberId ? { ...m, role } : m
              ),
            },
          }))
        },

        removeMember: (workspaceId, memberId) => {
          set((state) => ({
            membersByWorkspace: {
              ...state.membersByWorkspace,
              [workspaceId]: state.membersByWorkspace[workspaceId].filter(
                (m) => m.id !== memberId
              ),
            },
            workspaces: {
              ...state.workspaces,
              [workspaceId]: {
                ...state.workspaces[workspaceId],
                memberCount: state.workspaces[workspaceId].memberCount - 1,
              },
            },
          }))
        },

        loadWorkspaces: () => {
          set({ isLoading: true })
          setTimeout(() => {
            set({ isLoading: false })
          }, 500)
        },
      },
    }),
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
