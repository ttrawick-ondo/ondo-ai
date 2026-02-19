import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/session'

/**
 * Action Dispatcher
 *
 * Routes action requests to the appropriate system handler.
 * Actions are operations that modify external systems (CRUD operations, notifications, etc.)
 *
 * Supported systems:
 * - ondobot: Internal bot operations
 * - hubspot: HubSpot CRM (future)
 * - jira: Jira tickets (future)
 * - slack: Slack messaging (future)
 */

export type ActionSystem = 'ondobot' | 'hubspot' | 'jira' | 'slack'

export interface ActionRequest {
  system: ActionSystem
  action: string
  parameters: Record<string, unknown>
}

export interface ActionResult {
  success: boolean
  data?: unknown
  error?: {
    code: string
    message: string
  }
}

export interface ActionAuth {
  valid: boolean
  user?: {
    id: string
    email?: string
  }
  source: 'api_key' | 'session' | 'glean_agent'
}

/**
 * Validate action authentication
 * Supports session cookies, API keys, and Glean agent tokens
 */
async function validateActionAuth(request: NextRequest): Promise<ActionAuth> {
  // Check session-based auth first (browser requests)
  const session = await requireSession()
  if (session) {
    return {
      valid: true,
      user: { id: session.user.id, email: session.user.email ?? undefined },
      source: 'session',
    }
  }

  // Check for Bearer token (API clients)
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return { valid: false, source: 'api_key' }
  }

  const token = authHeader.slice(7)

  // Internal API key check
  const internalApiKey = process.env.ACTIONS_API_KEY
  if (internalApiKey && token === internalApiKey) {
    return {
      valid: true,
      user: { id: 'system', email: 'system@internal' },
      source: 'api_key',
    }
  }

  // Glean agent token validation — validate against actual GLEAN_API_KEY
  const gleanApiKey = process.env.GLEAN_API_KEY
  if (gleanApiKey && token === gleanApiKey) {
    return {
      valid: true,
      user: { id: 'glean-agent' },
      source: 'glean_agent',
    }
  }

  return { valid: false, source: 'api_key' }
}

/**
 * Action handler registry
 * Maps system.action to handler functions
 */
type ActionHandler = (
  parameters: Record<string, unknown>,
  auth: ActionAuth
) => Promise<ActionResult>

const actionHandlers: Record<string, Record<string, ActionHandler>> = {
  ondobot: {
    // OndoBot actions are proxied to the OndoBot API
    // Actual handlers are in /api/actions/ondobot/route.ts
    default: async () => ({
      success: false,
      error: {
        code: 'USE_DEDICATED_ENDPOINT',
        message: 'OndoBot actions should be routed through /api/actions/ondobot',
      },
    }),
  },
  hubspot: {
    // HubSpot actions (future implementation)
    create_contact: async () => ({
      success: false,
      error: { code: 'NOT_IMPLEMENTED', message: 'HubSpot integration not yet implemented' },
    }),
    update_deal: async () => ({
      success: false,
      error: { code: 'NOT_IMPLEMENTED', message: 'HubSpot integration not yet implemented' },
    }),
  },
  jira: {
    // Jira actions (future implementation)
    create_issue: async () => ({
      success: false,
      error: { code: 'NOT_IMPLEMENTED', message: 'Jira integration not yet implemented' },
    }),
    update_issue: async () => ({
      success: false,
      error: { code: 'NOT_IMPLEMENTED', message: 'Jira integration not yet implemented' },
    }),
  },
  slack: {
    // Slack actions (future implementation)
    send_message: async () => ({
      success: false,
      error: { code: 'NOT_IMPLEMENTED', message: 'Slack integration not yet implemented' },
    }),
  },
}

/**
 * Log action execution for audit purposes
 */
function logActionExecution(
  system: string,
  action: string,
  auth: ActionAuth,
  result: ActionResult
): void {
  console.log(JSON.stringify({
    type: 'action_execution',
    timestamp: new Date().toISOString(),
    system,
    action,
    userId: auth.user?.id,
    authSource: auth.source,
    success: result.success,
    errorCode: result.error?.code,
  }))
}

/**
 * POST /api/actions - Execute an action on an external system
 */
export async function POST(request: NextRequest) {
  try {
    const body: ActionRequest = await request.json()

    // Validate request structure
    if (!body.system || !body.action) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'system and action are required',
          },
        },
        { status: 400 }
      )
    }

    // Validate authentication
    const auth = await validateActionAuth(request)
    if (!auth.valid) {
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

    // Check for OndoBot - redirect to dedicated endpoint
    if (body.system === 'ondobot') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'USE_DEDICATED_ENDPOINT',
            message: 'OndoBot actions should use POST /api/actions/ondobot',
          },
        },
        { status: 400 }
      )
    }

    // Find handler for this system/action
    const systemHandlers = actionHandlers[body.system]
    if (!systemHandlers) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNKNOWN_SYSTEM',
            message: `Unknown action system: ${body.system}`,
          },
        },
        { status: 400 }
      )
    }

    const handler = systemHandlers[body.action] || systemHandlers.default
    if (!handler) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNKNOWN_ACTION',
            message: `Unknown action: ${body.action} for system ${body.system}`,
          },
        },
        { status: 400 }
      )
    }

    // Execute the action
    const result = await handler(body.parameters || {}, auth)

    // Log for audit
    logActionExecution(body.system, body.action, auth, result)

    return NextResponse.json(result, {
      status: result.success ? 200 : 500,
    })
  } catch (error) {
    console.error('Action dispatch error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Action execution failed',
        },
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/actions - List available action systems and their actions
 */
export async function GET() {
  const session = await requireSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const systems = Object.keys(actionHandlers).map((system) => ({
    system,
    actions: Object.keys(actionHandlers[system]).filter((a) => a !== 'default'),
    status: system === 'ondobot' ? 'active' : 'not_implemented',
  }))

  return NextResponse.json({ systems })
}
