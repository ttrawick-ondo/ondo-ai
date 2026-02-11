/**
 * Tool Execution Service
 *
 * Handles parsing, validation, and execution of tool calls.
 * Extracted from chatStore for better separation of concerns.
 */

import { toast } from 'sonner'
import { toolRegistry } from '@/lib/tools'
import type { ToolCall, ToolExecutionRecord } from '@/types'

export interface ParsedToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
}

export interface ToolExecutionOptions {
  parallel?: boolean
}

/**
 * Parse tool call arguments from JSON string with error handling
 */
export function parseToolCallArguments(tc: ToolCall): ParsedToolCall {
  let parsedArgs: Record<string, unknown>

  try {
    parsedArgs = JSON.parse(tc.function.arguments)
  } catch (parseError) {
    console.error(`Failed to parse arguments for tool ${tc.function.name}:`, parseError)
    toast.error(`Invalid arguments for tool "${tc.function.name}"`)
    parsedArgs = {}
  }

  // Validate that parsedArgs is an object
  if (typeof parsedArgs !== 'object' || parsedArgs === null) {
    console.error(`Invalid argument type for tool ${tc.function.name}: expected object`)
    toast.error(`Invalid argument format for tool "${tc.function.name}"`)
    parsedArgs = {}
  }

  return {
    id: tc.id,
    name: tc.function.name,
    arguments: parsedArgs,
  }
}

/**
 * Execute multiple tool calls
 */
export async function executeToolCalls(
  toolCalls: ToolCall[],
  options: ToolExecutionOptions = {}
): Promise<ToolExecutionRecord[]> {
  const { parallel = true } = options

  try {
    const parsedCalls = toolCalls.map(parseToolCallArguments)
    const results = await toolRegistry.executeToolCalls(parsedCalls, { parallel })
    return results
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Tool execution failed'
    console.error('Tool execution error:', error)
    toast.error(message)

    // Return error results to allow conversation to continue
    const now = Date.now()
    return toolCalls.map((tc): ToolExecutionRecord => ({
      id: tc.id,
      toolName: tc.function.name,
      arguments: {},
      result: {
        success: false,
        output: '',
        error: message,
      },
      startedAt: now,
      completedAt: now,
      duration: 0,
    }))
  }
}

/**
 * Get tool configuration in API format for specified tool names
 */
export function getToolsConfig(toolNames: string[]) {
  if (toolNames.length === 0) return undefined
  return toolRegistry.toAPIFormat(toolNames)
}
