/**
 * Tool Registry - Manages available tools for function calling
 */

import type {
  ToolDefinition,
  ToolAPIFormat,
  ToolResult,
  ParsedToolCall,
  ToolExecutionRecord,
  ToolExecutionOptions,
} from '@/types/tools'

const DEFAULT_TIMEOUT = 30000 // 30 seconds
const DEFAULT_MAX_RETRIES = 1

class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map()
  private enabledTools: Set<string> = new Set()

  /**
   * Register a new tool
   */
  register(tool: ToolDefinition): void {
    if (this.tools.has(tool.name)) {
      console.warn(`Tool "${tool.name}" is already registered. Overwriting.`)
    }
    this.tools.set(tool.name, tool)
    this.enabledTools.add(tool.name)
  }

  /**
   * Unregister a tool
   */
  unregister(name: string): boolean {
    this.enabledTools.delete(name)
    return this.tools.delete(name)
  }

  /**
   * Get a tool by name
   */
  getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name)
  }

  /**
   * Get all registered tools
   */
  getAllTools(): ToolDefinition[] {
    return Array.from(this.tools.values())
  }

  /**
   * Get enabled tools only
   */
  getEnabledTools(): ToolDefinition[] {
    return Array.from(this.tools.values()).filter((t) =>
      this.enabledTools.has(t.name)
    )
  }

  /**
   * Enable/disable a tool
   */
  setEnabled(name: string, enabled: boolean): void {
    if (!this.tools.has(name)) {
      throw new Error(`Tool "${name}" not found`)
    }
    if (enabled) {
      this.enabledTools.add(name)
    } else {
      this.enabledTools.delete(name)
    }
  }

  /**
   * Check if a tool is enabled
   */
  isEnabled(name: string): boolean {
    return this.enabledTools.has(name)
  }

  /**
   * Convert tools to OpenAI API format
   */
  toAPIFormat(toolNames?: string[]): ToolAPIFormat[] {
    const tools = toolNames
      ? toolNames.map((n) => this.tools.get(n)).filter(Boolean) as ToolDefinition[]
      : this.getEnabledTools()

    return tools.map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }))
  }

  /**
   * Parse a tool call from the API response
   */
  parseToolCall(toolCall: { id: string; function: { name: string; arguments: string } }): ParsedToolCall {
    let args: Record<string, unknown>
    try {
      args = JSON.parse(toolCall.function.arguments)
    } catch {
      args = {}
    }

    return {
      id: toolCall.id,
      name: toolCall.function.name,
      arguments: args,
    }
  }

  /**
   * Execute a tool by name
   */
  async executeTool(
    name: string,
    args: Record<string, unknown>,
    options: ToolExecutionOptions = {}
  ): Promise<ToolResult> {
    const tool = this.tools.get(name)
    if (!tool) {
      return {
        success: false,
        output: '',
        error: `Tool "${name}" not found`,
      }
    }

    if (!this.enabledTools.has(name)) {
      return {
        success: false,
        output: '',
        error: `Tool "${name}" is disabled`,
      }
    }

    const timeout = options.timeout ?? DEFAULT_TIMEOUT
    const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES

    let lastError: Error | null = null
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await Promise.race([
          tool.handler(args),
          new Promise<ToolResult>((_, reject) =>
            setTimeout(() => reject(new Error('Tool execution timeout')), timeout)
          ),
        ])
        return result
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)))
        }
      }
    }

    return {
      success: false,
      output: '',
      error: lastError?.message || 'Unknown error',
    }
  }

  /**
   * Execute multiple tool calls (optionally in parallel)
   */
  async executeToolCalls(
    toolCalls: ParsedToolCall[],
    options: ToolExecutionOptions = {}
  ): Promise<ToolExecutionRecord[]> {
    const executeOne = async (call: ParsedToolCall): Promise<ToolExecutionRecord> => {
      const startedAt = Date.now()
      const result = await this.executeTool(call.name, call.arguments, options)
      const completedAt = Date.now()

      return {
        id: call.id,
        toolName: call.name,
        arguments: call.arguments,
        result,
        startedAt,
        completedAt,
        duration: completedAt - startedAt,
      }
    }

    if (options.parallel) {
      return Promise.all(toolCalls.map(executeOne))
    }

    // Sequential execution
    const results: ToolExecutionRecord[] = []
    for (const call of toolCalls) {
      results.push(await executeOne(call))
    }
    return results
  }

  /**
   * Clear all tools
   */
  clear(): void {
    this.tools.clear()
    this.enabledTools.clear()
  }

  /**
   * Get the number of registered tools
   */
  size(): number {
    return this.tools.size
  }
}

// Singleton instance
export const toolRegistry = new ToolRegistry()

// Helper to create tool definitions
export function createTool(
  name: string,
  description: string,
  parameters: ToolDefinition['parameters'],
  handler: ToolDefinition['handler']
): ToolDefinition {
  return { name, description, parameters, handler }
}

export { ToolRegistry }
