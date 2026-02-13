/**
 * Execute Action Tool
 * Allows AI to execute actions on external systems through the action dispatcher
 */

import { createTool } from '../registry'
import type { ToolResult } from '@/types/tools'

export type ActionSystem = 'ondobot' | 'hubspot' | 'jira' | 'slack'

interface ActionResponse {
  success: boolean
  data?: unknown
  error?: {
    code: string
    message: string
  }
}

export const executeActionTool = createTool(
  'execute_action',
  'Execute an action on an external system. Use this to search ownership, find candidates, create tickets, send messages, update records, or trigger automations. Available systems: ondobot (internal bot with ownership & candidate data), hubspot (CRM - future), jira (tickets - future), slack (messaging - future).',
  {
    type: 'object',
    properties: {
      system: {
        type: 'string',
        enum: ['ondobot', 'hubspot', 'jira', 'slack'],
        description: 'The external system to execute the action on.',
      },
      action: {
        type: 'string',
        description: 'The action to execute. For ondobot: search_ownership (find who owns something), list_owner_areas (list what someone owns), search_candidates (find candidates), get_candidate_profile (get candidate details), execute_tool (run any tool), list_tools, chat, run_automation, query_data, get_status, list_automations.',
      },
      parameters: {
        type: 'object',
        description: 'Parameters for the action. For search_ownership: {query: string, limit?: number}. For list_owner_areas: {owner: string}. For search_candidates: {query: string, limit?: number}. For get_candidate_profile: {candidate_id: string}. For execute_tool: {tool: string, params: object}.',
      },
    },
    required: ['system', 'action'],
  },
  async (args): Promise<ToolResult> => {
    try {
      const system = args.system as ActionSystem
      const action = args.action as string
      const parameters = (args.parameters as Record<string, unknown>) || {}

      // Validate system
      const validSystems: ActionSystem[] = ['ondobot', 'hubspot', 'jira', 'slack']
      if (!validSystems.includes(system)) {
        return {
          success: false,
          output: '',
          error: `Invalid system: ${system}. Valid systems: ${validSystems.join(', ')}`,
        }
      }

      // Validate action
      if (!action || action.trim().length === 0) {
        return {
          success: false,
          output: '',
          error: 'Action cannot be empty',
        }
      }

      // Route to the appropriate endpoint
      let endpoint: string
      let body: Record<string, unknown>

      if (system === 'ondobot') {
        // OndoBot has a dedicated endpoint
        endpoint = '/api/actions/ondobot'
        body = { action, parameters }
      } else {
        // Other systems use the main dispatcher
        endpoint = '/api/actions'
        body = { system, action, parameters }
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // The API route will handle internal authentication
        },
        body: JSON.stringify(body),
      })

      const result: ActionResponse = await response.json()

      if (!result.success) {
        return {
          success: false,
          output: '',
          error: result.error?.message || 'Action execution failed',
          metadata: {
            system,
            action,
            errorCode: result.error?.code,
          },
        }
      }

      // Format the result for the AI
      let output = `Successfully executed ${action} on ${system}.`
      if (result.data) {
        output += `\n\nResult:\n${JSON.stringify(result.data, null, 2)}`
      }

      return {
        success: true,
        output,
        metadata: {
          system,
          action,
          data: result.data,
        },
      }
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : 'Action execution failed',
      }
    }
  }
)

/**
 * Get available actions for a system
 */
export function getAvailableActions(system: ActionSystem): string[] {
  const actions: Record<ActionSystem, string[]> = {
    ondobot: [
      // Tool API actions (primary)
      'search_ownership',
      'list_owner_areas',
      'search_candidates',
      'get_candidate_profile',
      'execute_tool',
      'list_tools',
      // Legacy actions
      'chat',
      'run_automation',
      'query_data',
      'get_status',
      'list_automations',
    ],
    hubspot: ['create_contact', 'update_deal'], // Future
    jira: ['create_issue', 'update_issue'], // Future
    slack: ['send_message'], // Future
  }
  return actions[system] || []
}
