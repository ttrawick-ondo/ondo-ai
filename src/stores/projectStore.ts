import { useMemo } from 'react'
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { Project, CreateProjectInput, UpdateProjectInput } from '@/types'
import { PROJECT_COLORS } from '@/types'
import { mockProjects } from '@/lib/mocks/data'
import { generateId } from '@/lib/utils'

interface ProjectState {
  projects: Record<string, Project>
  activeProjectId: string | null
  isLoading: boolean
}

interface ProjectActions {
  setActiveProject: (id: string | null) => void
  createProject: (input: CreateProjectInput) => Project
  updateProject: (id: string, input: UpdateProjectInput) => void
  deleteProject: (id: string) => void
  loadProjects: () => void
}

type ProjectStore = ProjectState & { actions: ProjectActions }

// Convert array to record
const projectsRecord = mockProjects.reduce((acc, proj) => {
  acc[proj.id] = proj
  return acc
}, {} as Record<string, Project>)

export const useProjectStore = create<ProjectStore>()(
  devtools(
    (set, get) => ({
      projects: projectsRecord,
      activeProjectId: null,
      isLoading: false,

      actions: {
        setActiveProject: (id) => {
          set({ activeProjectId: id })
        },

        createProject: (input) => {
          const id = `proj-${generateId()}`
          const now = new Date()

          const project: Project = {
            id,
            name: input.name,
            description: input.description,
            color: input.color || PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)],
            icon: input.icon,
            workspaceId: input.workspaceId,
            userId: 'user-1',
            conversationCount: 0,
            createdAt: now,
            updatedAt: now,
          }

          set((state) => ({
            projects: { ...state.projects, [id]: project },
          }))

          return project
        },

        updateProject: (id, input) => {
          set((state) => ({
            projects: {
              ...state.projects,
              [id]: {
                ...state.projects[id],
                ...input,
                updatedAt: new Date(),
              },
            },
          }))
        },

        deleteProject: (id) => {
          set((state) => {
            const { [id]: _, ...projects } = state.projects
            return {
              projects,
              activeProjectId: state.activeProjectId === id ? null : state.activeProjectId,
            }
          })
        },

        loadProjects: () => {
          set({ isLoading: true })
          setTimeout(() => {
            set({ isLoading: false })
          }, 500)
        },
      },
    }),
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

export const useProjectActions = () => useProjectStore.getState().actions
