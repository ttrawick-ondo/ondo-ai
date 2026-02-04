import { useMemo } from 'react'
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { toast } from 'sonner'
import type { Project, CreateProjectInput, UpdateProjectInput } from '@/types'
import { PROJECT_COLORS } from '@/types'
import { generateId } from '@/lib/utils'
import { projectApi } from '@/lib/api/client/projects'

interface ProjectState {
  projects: Record<string, Project>
  activeProjectId: string | null
  isLoading: boolean
  isSyncing: boolean
  isInitialized: boolean
}

interface ProjectActions {
  setActiveProject: (id: string | null) => void
  createProject: (input: CreateProjectInput) => Promise<Project>
  updateProject: (id: string, input: UpdateProjectInput) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  archiveProject: (id: string) => Promise<void>
  unarchiveProject: (id: string) => Promise<void>
  loadProjects: (projects: Project[]) => void
  fetchUserProjects: (userId: string, workspaceId?: string) => Promise<void>
  setLoading: (loading: boolean) => void
}

type ProjectStore = ProjectState & { actions: ProjectActions }

export const useProjectStore = create<ProjectStore>()(
  devtools(
    persist(
      (set, get) => ({
        projects: {},
        activeProjectId: null,
        isLoading: false,
        isSyncing: false,
        isInitialized: false,

        actions: {
          setActiveProject: (id) => {
            set({ activeProjectId: id })
          },

          createProject: async (input) => {
            const tempId = `temp-proj-${generateId()}`
            const now = new Date()

            // Optimistic update
            const tempProject: Project = {
              id: tempId,
              name: input.name,
              description: input.description,
              color: input.color || PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)],
              icon: input.icon,
              workspaceId: input.workspaceId,
              userId: 'user-1', // Will be replaced by actual user
              conversationCount: 0,
              createdAt: now,
              updatedAt: now,
            }

            set((state) => ({
              projects: { ...state.projects, [tempId]: tempProject },
              isSyncing: true,
            }))

            try {
              // Call API - returns ProjectWithStats with userId already mapped
              const project = await projectApi.createProject({
                workspaceId: input.workspaceId || 'default',
                ownerId: 'user-1', // TODO: Get from auth context
                name: input.name,
                description: input.description,
                color: input.color,
                icon: input.icon,
              })

              // Replace temp project with real one
              set((state) => {
                const newProjects = { ...state.projects }
                delete newProjects[tempId]
                newProjects[project.id] = project
                return { projects: newProjects, isSyncing: false }
              })

              toast.success('Project created')
              return project
            } catch (error) {
              // Rollback optimistic update
              set((state) => {
                const newProjects = { ...state.projects }
                delete newProjects[tempId]
                return { projects: newProjects, isSyncing: false }
              })

              const message = error instanceof Error ? error.message : 'Failed to create project'
              toast.error(message)
              throw error
            }
          },

          updateProject: async (id, input) => {
            const existing = get().projects[id]
            if (!existing) return

            // Optimistic update
            const optimisticProject = {
              ...existing,
              ...input,
              updatedAt: new Date(),
            }

            set((state) => ({
              projects: { ...state.projects, [id]: optimisticProject },
              isSyncing: true,
            }))

            try {
              await projectApi.updateProject(id, input)
              set({ isSyncing: false })
            } catch (error) {
              // Rollback optimistic update
              set((state) => ({
                projects: { ...state.projects, [id]: existing },
                isSyncing: false,
              }))

              const message = error instanceof Error ? error.message : 'Failed to update project'
              toast.error(message)
              throw error
            }
          },

          deleteProject: async (id) => {
            const existing = get().projects[id]
            if (!existing) return

            // Optimistic delete
            set((state) => {
              const { [id]: _, ...projects } = state.projects
              return {
                projects,
                activeProjectId: state.activeProjectId === id ? null : state.activeProjectId,
                isSyncing: true,
              }
            })

            try {
              await projectApi.deleteProject(id)
              set({ isSyncing: false })
              toast.success('Project deleted')
            } catch (error) {
              // Rollback optimistic delete
              set((state) => ({
                projects: { ...state.projects, [id]: existing },
                isSyncing: false,
              }))

              const message = error instanceof Error ? error.message : 'Failed to delete project'
              toast.error(message)
              throw error
            }
          },

          archiveProject: async (id) => {
            const existing = get().projects[id]
            if (!existing) return

            // Optimistic update (remove from visible projects)
            set((state) => {
              const { [id]: _, ...projects } = state.projects
              return {
                projects,
                activeProjectId: state.activeProjectId === id ? null : state.activeProjectId,
                isSyncing: true,
              }
            })

            try {
              await projectApi.archiveProject(id)
              set({ isSyncing: false })
              toast.success('Project archived')
            } catch (error) {
              // Rollback
              set((state) => ({
                projects: { ...state.projects, [id]: existing },
                isSyncing: false,
              }))

              const message = error instanceof Error ? error.message : 'Failed to archive project'
              toast.error(message)
              throw error
            }
          },

          unarchiveProject: async (id) => {
            try {
              set({ isSyncing: true })
              // API returns ProjectWithStats with userId already mapped
              const project = await projectApi.unarchiveProject(id)
              set((state) => ({
                projects: { ...state.projects, [project.id]: project },
                isSyncing: false,
              }))
              toast.success('Project restored')
            } catch (error) {
              set({ isSyncing: false })
              const message = error instanceof Error ? error.message : 'Failed to restore project'
              toast.error(message)
              throw error
            }
          },

          loadProjects: (projects) => {
            const projectsRecord = projects.reduce((acc, proj) => {
              acc[proj.id] = proj
              return acc
            }, {} as Record<string, Project>)

            set({ projects: projectsRecord, isInitialized: true })
          },

          fetchUserProjects: async (userId, workspaceId) => {
            set({ isLoading: true })
            try {
              // API returns ProjectWithStats with userId already mapped
              const projects = await projectApi.getUserProjects(userId, { workspaceId })
              get().actions.loadProjects(projects)
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Failed to load projects'
              toast.error(message)
            } finally {
              set({ isLoading: false })
            }
          },

          setLoading: (loading) => {
            set({ isLoading: loading })
          },
        },
      }),
      {
        name: 'project-store',
        partialize: (state) => ({
          // Only persist activeProjectId, not projects themselves (they come from DB)
          activeProjectId: state.activeProjectId,
        }),
      }
    ),
    { name: 'project-store' }
  )
)

// Selector hooks
export const useProjects = (): Project[] => {
  const projects = useProjectStore((state) => state.projects)
  return useMemo(() => Object.values(projects), [projects])
}

export const useActiveProject = () =>
  useProjectStore((state) =>
    state.activeProjectId ? state.projects[state.activeProjectId] : null
  )

export const useProjectById = (id: string) =>
  useProjectStore((state) => state.projects[id])

export const useProjectsByWorkspace = (workspaceId?: string): Project[] => {
  const projects = useProjectStore((state) => state.projects)
  return useMemo(
    () =>
      Object.values(projects).filter(
        (p) => (workspaceId ? p.workspaceId === workspaceId : !p.workspaceId)
      ),
    [projects, workspaceId]
  )
}

export const useProjectLoading = (): boolean => {
  return useProjectStore((state) => state.isLoading)
}

export const useProjectSyncing = (): boolean => {
  return useProjectStore((state) => state.isSyncing)
}

export const useProjectsInitialized = (): boolean => {
  return useProjectStore((state) => state.isInitialized)
}

export const useProjectActions = () => useProjectStore.getState().actions
