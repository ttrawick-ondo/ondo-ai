/**
 * Workspace Store
 *
 * Manages UI state for workspaces. Data fetching is handled by React Query.
 * This store only persists the active workspace selection.
 */

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

interface WorkspaceUIState {
  activeWorkspaceId: string | null
}

interface WorkspaceUIActions {
  setActiveWorkspace: (id: string | null) => void
}

type WorkspaceStore = WorkspaceUIState & { actions: WorkspaceUIActions }

export const useWorkspaceStore = create<WorkspaceStore>()(
  devtools(
    persist(
      (set) => ({
        activeWorkspaceId: null,

        actions: {
          setActiveWorkspace: (id) => {
            set({ activeWorkspaceId: id })
          },
        },
      }),
      {
        name: 'workspace-store',
        partialize: (state) => ({
          activeWorkspaceId: state.activeWorkspaceId,
        }),
      }
    ),
    { name: 'workspace-store' }
  )
)

// ============================================================================
// Selectors
// ============================================================================

export const useActiveWorkspaceId = () =>
  useWorkspaceStore((state) => state.activeWorkspaceId)

export const useWorkspaceUIActions = () =>
  useWorkspaceStore((state) => state.actions)

// Legacy alias for backwards compatibility
export const useWorkspaceActions = useWorkspaceUIActions
