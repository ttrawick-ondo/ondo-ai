import { NextRequest, NextResponse } from 'next/server'
import { getProvider } from '@/lib/api/providers'
import { OndoBotProvider } from '@/lib/api/providers/ondobot'

/**
 * OndoBot Action Handler
 *
 * Proxies action requests to the OndoBot internal API.
 * Supports various OndoBot-specific actions like running automations,
 * querying internal data, and triggering workflows.
 */

interface OndoBotActionRequest {
  action: string
  parameters: Record<string, unknown>
}

interface OndoBotActionResult {
  success: boolean
  data?: unknown
  error?: {
    code: string
    message: string
  }
}

/**
 * Get the OndoBot API base URL
 */
function getOndoBotBaseUrl(): string {
  return process.env.ONDOBOT_API_URL || 'https://ondobot.internal.company.com/api'
}

/**
 * Get OndoBot API headers
 */
function getOndoBotHeaders(): Record<string, string> {
  const apiKey = process.env.ONDOBOT_API_KEY
  if (!apiKey) {
    throw new Error('ONDOBOT_API_KEY is not configured')
  }

  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }
}

/**
 * Validate the authentication for OndoBot actions
 */
async function validateOndoBotAuth(request: NextRequest): Promise<boolean> {
  // Allow same-origin browser requests (for UI components like ParentSelectionResult)
  // These are protected by CORS and don't need Bearer token
  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')
  const host = request.headers.get('host')

  // If request comes from same origin (browser), allow it
  if (origin && host && (origin.includes(host) || origin.includes('localhost'))) {
    return true
  }
  if (referer && host && (referer.includes(host) || referer.includes('localhost'))) {
    return true
  }

  // For external API requests, require Bearer token
  const authHeader = request.headers.get('authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    return false
  }

  const token = authHeader.slice(7)

  // Check internal API key
  const actionsApiKey = process.env.ACTIONS_API_KEY
  if (actionsApiKey && token === actionsApiKey) {
    return true
  }

  // Check OndoBot-specific key
  const ondoBotApiKey = process.env.ONDOBOT_API_KEY
  if (ondoBotApiKey && token === ondoBotApiKey) {
    return true
  }

  // Check Glean agent token
  if (token.startsWith('glean-')) {
    return true
  }

  return false
}

/**
 * Available OndoBot actions
 * Now includes Tool API actions from slackbot-ondo
 */
const SUPPORTED_ACTIONS = [
  'chat',
  'run_automation',
  'query_data',
  'get_status',
  'list_automations',
  // Tool API actions
  'execute_tool',
  'list_tools',
  'search_ownership',
  'list_owner_areas',
  'search_candidates',
  'get_candidate_profile',
] as const

type OndoBotAction = (typeof SUPPORTED_ACTIONS)[number]

/**
 * Check if an action is supported
 */
function isSupportedAction(action: string): action is OndoBotAction {
  return SUPPORTED_ACTIONS.includes(action as OndoBotAction)
}

/**
 * Execute an OndoBot action
 */
async function executeOndoBotAction(
  action: OndoBotAction,
  parameters: Record<string, unknown>
): Promise<OndoBotActionResult> {
  const baseUrl = getOndoBotBaseUrl()
  const headers = getOndoBotHeaders()

  switch (action) {
    case 'chat': {
      // Use the OndoBot provider for chat
      const provider = getProvider('ondobot') as OndoBotProvider
      if (!provider.isConfigured()) {
        return {
          success: false,
          error: {
            code: 'NOT_CONFIGURED',
            message: 'OndoBot provider is not configured',
          },
        }
      }

      const response = await provider.complete({
        conversationId: (parameters.conversationId as string) || 'default',
        messages: [
          {
            role: 'user',
            content: parameters.message as string,
          },
        ],
        provider: 'ondobot',
        model: 'ondobot-default',
      })

      return {
        success: true,
        data: {
          response: response.message.content,
          metadata: response.metadata,
        },
      }
    }

    case 'run_automation': {
      const response = await fetch(`${baseUrl}/automations/run`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          automationId: parameters.automationId,
          inputs: parameters.inputs,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        return {
          success: false,
          error: {
            code: 'AUTOMATION_FAILED',
            message: `Automation failed: ${errorText}`,
          },
        }
      }

      const data = await response.json()
      return { success: true, data }
    }

    case 'query_data': {
      const response = await fetch(`${baseUrl}/data/query`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: parameters.query,
          datasource: parameters.datasource,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        return {
          success: false,
          error: {
            code: 'QUERY_FAILED',
            message: `Query failed: ${errorText}`,
          },
        }
      }

      const data = await response.json()
      return { success: true, data }
    }

    case 'get_status': {
      const response = await fetch(`${baseUrl}/status`, {
        headers,
      })

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: 'STATUS_CHECK_FAILED',
            message: 'Failed to get OndoBot status',
          },
        }
      }

      const data = await response.json()
      return { success: true, data }
    }

    case 'list_automations': {
      const response = await fetch(`${baseUrl}/automations`, {
        headers,
      })

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: 'LIST_FAILED',
            message: 'Failed to list automations',
          },
        }
      }

      const data = await response.json()
      return { success: true, data }
    }

    // ==================== Tool API Actions ====================

    case 'execute_tool': {
      // Execute any OndoBot tool via the Tool API
      const toolName = parameters.tool as string
      const toolParams = (parameters.params as Record<string, unknown>) || {}
      const userEmail = parameters.userEmail as string | undefined

      if (!toolName) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'tool parameter is required for execute_tool action',
          },
        }
      }

      const response = await fetch(`${baseUrl}/api/v1/tools/execute`, {
        method: 'POST',
        headers: {
          ...headers,
          ...(userEmail && { 'X-User-Email': userEmail }),
        },
        body: JSON.stringify({
          tool: toolName,
          params: toolParams,
        }),
      })

      const data = await response.json()
      return data
    }

    case 'list_tools': {
      // List all available OndoBot tools
      const response = await fetch(`${baseUrl}/api/v1/tools`, {
        headers,
      })

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: 'LIST_TOOLS_FAILED',
            message: 'Failed to list OndoBot tools',
          },
        }
      }

      const data = await response.json()
      return { success: true, data }
    }

    case 'search_ownership': {
      // Convenience action for ownership search
      const query = parameters.query as string
      const limit = parameters.limit as number | undefined

      if (!query) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'query parameter is required',
          },
        }
      }

      const response = await fetch(`${baseUrl}/api/v1/ownership/search`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query, limit }),
      })

      const data = await response.json()
      return data
    }

    case 'list_owner_areas': {
      // List areas for a specific owner
      const owner = parameters.owner as string

      if (!owner) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'owner parameter is required',
          },
        }
      }

      const response = await fetch(`${baseUrl}/api/v1/tools/execute`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          tool: 'list_owner_areas',
          params: { owner },
        }),
      })

      const data = await response.json()
      return data
    }

    case 'search_candidates': {
      // Convenience action for candidate search
      const query = parameters.query as string
      const limit = parameters.limit as number | undefined

      if (!query) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'query parameter is required',
          },
        }
      }

      const response = await fetch(`${baseUrl}/api/v1/candidates/search`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query, limit }),
      })

      const data = await response.json()
      return data
    }

    case 'get_candidate_profile': {
      // Get detailed candidate profile
      const candidateId = parameters.candidate_id as string

      if (!candidateId) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'candidate_id parameter is required',
          },
        }
      }

      const response = await fetch(`${baseUrl}/api/v1/tools/execute`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          tool: 'get_candidate_profile',
          params: { candidate_id: candidateId },
        }),
      })

      const data = await response.json()
      return data
    }

    default:
      return {
        success: false,
        error: {
          code: 'UNKNOWN_ACTION',
          message: `Unknown OndoBot action: ${action}`,
        },
      }
  }
}

/**
 * POST /api/actions/ondobot - Execute an OndoBot action
 */
export async function POST(request: NextRequest) {
  try {
    // Validate authentication
    const isAuthorized = await validateOndoBotAuth(request)
    if (!isAuthorized) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid or missing authentication',
          },
        },
        { status: 401 }
      )
    }

    const body: OndoBotActionRequest = await request.json()

    // Validate request
    if (!body.action) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'action is required',
          },
        },
        { status: 400 }
      )
    }

    // Check if action is supported
    if (!isSupportedAction(body.action)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNSUPPORTED_ACTION',
            message: `Unsupported action: ${body.action}. Supported actions: ${SUPPORTED_ACTIONS.join(', ')}`,
          },
        },
        { status: 400 }
      )
    }

    // Execute the action
    const result = await executeOndoBotAction(body.action, body.parameters || {})

    // Log for audit
    console.log(JSON.stringify({
      type: 'ondobot_action',
      timestamp: new Date().toISOString(),
      action: body.action,
      success: result.success,
      errorCode: result.error?.code,
    }))

    return NextResponse.json(result, {
      status: result.success ? 200 : 500,
    })
  } catch (error) {
    console.error('OndoBot action error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Action execution failed',
        },
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/actions/ondobot - List available OndoBot actions
 */
export async function GET() {
  return NextResponse.json({
    system: 'ondobot',
    actions: SUPPORTED_ACTIONS.map((action) => ({
      name: action,
      description: getActionDescription(action),
    })),
  })
}

/**
 * Get description for an action
 */
function getActionDescription(action: OndoBotAction): string {
  const descriptions: Record<OndoBotAction, string> = {
    chat: 'Send a message to OndoBot and get a response',
    run_automation: 'Execute an OndoBot automation workflow',
    query_data: 'Query data from OndoBot data sources',
    get_status: 'Get the current status of OndoBot',
    list_automations: 'List available automation workflows',
    // Tool API actions
    execute_tool: 'Execute any OndoBot tool by name with parameters',
    list_tools: 'List all available OndoBot tools with their schemas',
    search_ownership: 'Search for who owns a topic, area, or responsibility',
    list_owner_areas: 'List all ownership areas for a specific person',
    search_candidates: 'Search for candidates by name or email',
    get_candidate_profile: 'Get detailed profile for a specific candidate',
  }
  return descriptions[action]
}
