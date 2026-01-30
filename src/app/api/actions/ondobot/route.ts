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
 */
const SUPPORTED_ACTIONS = [
  'chat',
  'run_automation',
  'query_data',
  'get_status',
  'list_automations',
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
  }
  return descriptions[action]
}
