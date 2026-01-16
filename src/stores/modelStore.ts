import { useMemo } from 'react'
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type {
  ModelConfig,
  GleanAgentConfig,
  GleanDataSource,
  ProviderInfo,
  CreateGleanAgentInput,
  UpdateGleanAgentInput,
  AIProvider,
} from '@/types'
import { providersClient, gleanClient } from '@/lib/api/client'

interface ModelState {
  models: Record<string, ModelConfig>
  providers: ProviderInfo[]
  gleanAgentsByWorkspace: Record<string, GleanAgentConfig[]>
  gleanDataSources: GleanDataSource[]
  selectedModelId: string | null
  isLoading: boolean
  error: string | null
}

interface ModelActions {
  loadModels: () => Promise<void>
  loadGleanAgents: (workspaceId: string) => Promise<void>
  loadGleanDataSources: () => Promise<void>
  createGleanAgent: (
    workspaceId: string,
    input: CreateGleanAgentInput
  ) => Promise<GleanAgentConfig>
  updateGleanAgent: (
    agentId: string,
    input: UpdateGleanAgentInput
  ) => Promise<GleanAgentConfig>
  deleteGleanAgent: (agentId: string, workspaceId: string) => Promise<void>
  setSelectedModel: (modelId: string | null) => void
  getModelById: (modelId: string) => ModelConfig | undefined
  getModelsByProvider: (provider: AIProvider) => ModelConfig[]
}

type ModelStore = ModelState & { actions: ModelActions }

export const useModelStore = create<ModelStore>()(
  devtools(
    (set, get) => ({
      models: {},
      providers: [],
      gleanAgentsByWorkspace: {},
      gleanDataSources: [],
      selectedModelId: null,
      isLoading: false,
      error: null,

      actions: {
        loadModels: async () => {
          set({ isLoading: true, error: null })

          try {
            const response = await providersClient.getProviders()

            const modelsRecord = response.models.reduce((acc, model) => {
              acc[model.id] = model
              return acc
            }, {} as Record<string, ModelConfig>)

            set({
              models: modelsRecord,
              providers: response.providers,
              isLoading: false,
            })
          } catch (error) {
            set({
              isLoading: false,
              error: error instanceof Error ? error.message : 'Failed to load models',
            })
          }
        },

        loadGleanAgents: async (workspaceId: string) => {
          try {
            const agents = await gleanClient.listAgents(workspaceId)

            set((state) => ({
              gleanAgentsByWorkspace: {
                ...state.gleanAgentsByWorkspace,
                [workspaceId]: agents,
              },
            }))
          } catch (error) {
            console.error('Failed to load Glean agents:', error)
          }
        },

        loadGleanDataSources: async () => {
          try {
            const dataSources = await gleanClient.listDataSources()
            set({ gleanDataSources: dataSources })
          } catch (error) {
            console.error('Failed to load Glean data sources:', error)
          }
        },

        createGleanAgent: async (workspaceId: string, input: CreateGleanAgentInput) => {
          const agent = await gleanClient.createAgent(workspaceId, input)

          set((state) => ({
            gleanAgentsByWorkspace: {
              ...state.gleanAgentsByWorkspace,
              [workspaceId]: [
                ...(state.gleanAgentsByWorkspace[workspaceId] || []),
                agent,
              ],
            },
          }))

          return agent
        },

        updateGleanAgent: async (agentId: string, input: UpdateGleanAgentInput) => {
          const agent = await gleanClient.updateAgent(agentId, input)

          set((state) => {
            const newAgentsByWorkspace = { ...state.gleanAgentsByWorkspace }

            for (const workspaceId in newAgentsByWorkspace) {
              const agents = newAgentsByWorkspace[workspaceId]
              const index = agents.findIndex((a) => a.id === agentId)

              if (index !== -1) {
                newAgentsByWorkspace[workspaceId] = [
                  ...agents.slice(0, index),
                  agent,
                  ...agents.slice(index + 1),
                ]
                break
              }
            }

            return { gleanAgentsByWorkspace: newAgentsByWorkspace }
          })

          return agent
        },

        deleteGleanAgent: async (agentId: string, workspaceId: string) => {
          await gleanClient.deleteAgent(agentId)

          set((state) => ({
            gleanAgentsByWorkspace: {
              ...state.gleanAgentsByWorkspace,
              [workspaceId]: (state.gleanAgentsByWorkspace[workspaceId] || []).filter(
                (a) => a.id !== agentId
              ),
            },
          }))
        },

        setSelectedModel: (modelId: string | null) => {
          set({ selectedModelId: modelId })
        },

        getModelById: (modelId: string) => {
          return get().models[modelId]
        },

        getModelsByProvider: (provider: AIProvider) => {
          const { models } = get()
          return Object.values(models).filter((m) => m.provider === provider)
        },
      },
    }),
    { name: 'model-store' }
  )
)

// Selector hooks
export const useModels = (): ModelConfig[] => {
  const models = useModelStore((state) => state.models)
  return useMemo(() => Object.values(models), [models])
}

export const useProviders = () => useModelStore((state) => state.providers)

export const useSelectedModel = () => {
  const selectedModelId = useModelStore((state) => state.selectedModelId)
  const models = useModelStore((state) => state.models)
  return selectedModelId ? models[selectedModelId] : null
}

const EMPTY_GLEAN_AGENTS: GleanAgentConfig[] = []
export const useGleanAgents = (workspaceId: string) =>
  useModelStore((state) => state.gleanAgentsByWorkspace[workspaceId] ?? EMPTY_GLEAN_AGENTS)

export const useGleanDataSources = () =>
  useModelStore((state) => state.gleanDataSources)

export const useModelLoading = () => useModelStore((state) => state.isLoading)

export const useModelError = () => useModelStore((state) => state.error)

export const useModelActions = () => useModelStore.getState().actions
