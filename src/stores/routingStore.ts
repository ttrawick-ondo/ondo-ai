/**
 * Routing Preferences Store
 * Manages user preferences for intelligent request routing
 */

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { AIProvider } from '@/types'
import type { RequestIntent } from '@/lib/api/routing'

export interface RoutingPreferences {
  /** Enable automatic routing based on intent classification */
  autoRouting: boolean
  /** Provider preferences for each intent type */
  providerPreferences: Record<RequestIntent, AIProvider>
  /** Model overrides for each intent type (optional) */
  modelOverrides: Partial<Record<RequestIntent, string>>
  /** Show routing indicator in chat UI */
  showRoutingIndicator: boolean
  /** Minimum confidence threshold for auto-routing (0-1) */
  confidenceThreshold: number
}

interface RoutingState {
  preferences: RoutingPreferences
  /** Last routing result for display in UI */
  lastRouteInfo: {
    intent?: RequestIntent
    confidence?: number
    provider?: AIProvider
    wasAutoRouted?: boolean
  } | null
}

interface RoutingActions {
  setAutoRouting: (enabled: boolean) => void
  setProviderPreference: (intent: RequestIntent, provider: AIProvider) => void
  setModelOverride: (intent: RequestIntent, modelId: string | null) => void
  setShowRoutingIndicator: (show: boolean) => void
  setConfidenceThreshold: (threshold: number) => void
  resetToDefaults: () => void
  setLastRouteInfo: (info: RoutingState['lastRouteInfo']) => void
  getRoutingOptions: () => {
    autoRouting: boolean
    confidenceThreshold: number
    providerPreferences: Partial<Record<RequestIntent, AIProvider>>
    modelOverrides: Partial<Record<RequestIntent, string>>
  }
}

type RoutingStore = RoutingState & { actions: RoutingActions }

// Default preferences
const DEFAULT_PREFERENCES: RoutingPreferences = {
  autoRouting: false, // Off by default (opt-in)
  providerPreferences: {
    knowledge_query: 'glean',
    code_task: 'anthropic',
    data_analysis: 'openai',
    action_request: 'glean',
    general_chat: 'anthropic',
  },
  modelOverrides: {},
  showRoutingIndicator: true,
  confidenceThreshold: 0.7,
}

export const useRoutingStore = create<RoutingStore>()(
  devtools(
    persist(
      (set, get) => ({
        preferences: { ...DEFAULT_PREFERENCES },
        lastRouteInfo: null,

        actions: {
          setAutoRouting: (enabled: boolean) => {
            set((state) => ({
              preferences: {
                ...state.preferences,
                autoRouting: enabled,
              },
            }))
          },

          setProviderPreference: (intent: RequestIntent, provider: AIProvider) => {
            set((state) => ({
              preferences: {
                ...state.preferences,
                providerPreferences: {
                  ...state.preferences.providerPreferences,
                  [intent]: provider,
                },
              },
            }))
          },

          setModelOverride: (intent: RequestIntent, modelId: string | null) => {
            set((state) => {
              const newOverrides = { ...state.preferences.modelOverrides }
              if (modelId) {
                newOverrides[intent] = modelId
              } else {
                delete newOverrides[intent]
              }
              return {
                preferences: {
                  ...state.preferences,
                  modelOverrides: newOverrides,
                },
              }
            })
          },

          setShowRoutingIndicator: (show: boolean) => {
            set((state) => ({
              preferences: {
                ...state.preferences,
                showRoutingIndicator: show,
              },
            }))
          },

          setConfidenceThreshold: (threshold: number) => {
            set((state) => ({
              preferences: {
                ...state.preferences,
                confidenceThreshold: Math.max(0, Math.min(1, threshold)),
              },
            }))
          },

          resetToDefaults: () => {
            set({
              preferences: { ...DEFAULT_PREFERENCES },
              lastRouteInfo: null,
            })
          },

          setLastRouteInfo: (info) => {
            set({ lastRouteInfo: info })
          },

          getRoutingOptions: () => {
            const { preferences } = get()
            return {
              autoRouting: preferences.autoRouting,
              confidenceThreshold: preferences.confidenceThreshold,
              providerPreferences: preferences.providerPreferences,
              modelOverrides: preferences.modelOverrides,
            }
          },
        },
      }),
      {
        name: 'routing-preferences',
        partialize: (state) => ({ preferences: state.preferences }),
      }
    ),
    { name: 'routing-store' }
  )
)

// Selector hooks
export const useRoutingPreferences = () =>
  useRoutingStore((state) => state.preferences)

export const useAutoRouting = () =>
  useRoutingStore((state) => state.preferences.autoRouting)

export const useShowRoutingIndicator = () =>
  useRoutingStore((state) => state.preferences.showRoutingIndicator)

export const useProviderPreferences = () =>
  useRoutingStore((state) => state.preferences.providerPreferences)

export const useLastRouteInfo = () =>
  useRoutingStore((state) => state.lastRouteInfo)

export const useRoutingActions = () => useRoutingStore.getState().actions
