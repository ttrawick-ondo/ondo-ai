import Anthropic from '@anthropic-ai/sdk'
import type {
  AgentContext,
  AgentResult,
  AgentMetadata,
  BaseAgent,
  ExecutionPlan,
  ValidationResult,
  AgentEvent,
  AgentEventHandler,
  ToolUseRecord,
  FileChange,
  Tool,
  ToolResult,
} from '../types/index.js'

export abstract class AbstractAgent implements BaseAgent {
  abstract readonly metadata: AgentMetadata

  protected client: Anthropic
  protected eventHandlers: AgentEventHandler[] = []

  constructor(apiKey?: string) {
    this.client = new Anthropic({
      apiKey: apiKey ?? process.env.ANTHROPIC_API_KEY,
    })
  }

  onEvent(handler: AgentEventHandler): void {
    this.eventHandlers.push(handler)
  }

  protected async emit(event: AgentEvent): Promise<void> {
    for (const handler of this.eventHandlers) {
      await handler(event)
    }
  }

  abstract execute(context: AgentContext): Promise<AgentResult>
  abstract planExecution(context: AgentContext): Promise<ExecutionPlan>
  abstract validateResult(result: AgentResult): Promise<ValidationResult>

  protected async runAgentLoop(context: AgentContext): Promise<AgentResult> {
    const toolsUsed: ToolUseRecord[] = []
    const changes: FileChange[] = []
    let iterations = 0

    await this.emit({
      type: 'started',
      timestamp: Date.now(),
      data: { message: `Starting ${this.metadata.name}` },
    })

    const systemPrompt = this.buildSystemPrompt(context)
    const messages: Anthropic.MessageParam[] = [
      { role: 'user', content: this.buildInitialPrompt(context) },
    ]

    const tools = this.buildToolDefinitions(context.tools)

    try {
      while (iterations < context.maxIterations) {
        iterations++

        await this.emit({
          type: 'iteration_start',
          timestamp: Date.now(),
          data: { iteration: iterations },
        })

        const response = await this.client.messages.create({
          model: context.config.defaults.model,
          max_tokens: context.config.defaults.maxTokens,
          temperature: context.config.defaults.temperature,
          system: systemPrompt,
          messages,
          tools,
        })

        // Process response
        const assistantContent: Anthropic.ContentBlock[] = []
        let hasToolUse = false
        const toolResults: Anthropic.ToolResultBlockParam[] = []

        for (const block of response.content) {
          assistantContent.push(block)

          if (block.type === 'tool_use') {
            hasToolUse = true
            const tool = context.tools.get(block.name)

            if (tool) {
              await this.emit({
                type: 'tool_call',
                timestamp: Date.now(),
                data: { toolName: block.name, toolInput: block.input },
              })

              const result = await this.executeTool(tool, block.input, context)

              const toolRecord: ToolUseRecord = {
                toolName: block.name,
                input: block.input,
                result,
                timestamp: Date.now(),
              }
              toolsUsed.push(toolRecord)

              // Track file changes
              if (this.isFileModifyingTool(block.name)) {
                const change = this.extractFileChange(block.name, block.input as Record<string, unknown>, result)
                if (change) changes.push(change)
              }

              await this.emit({
                type: 'tool_result',
                timestamp: Date.now(),
                data: { toolName: block.name, toolResult: result },
              })

              toolResults.push({
                type: 'tool_result',
                tool_use_id: block.id,
                content: result.success ? result.output : `Error: ${result.error}`,
              })
            } else {
              toolResults.push({
                type: 'tool_result',
                tool_use_id: block.id,
                content: `Error: Unknown tool "${block.name}"`,
                is_error: true,
              })
            }
          } else if (block.type === 'text') {
            await this.emit({
              type: 'thinking',
              timestamp: Date.now(),
              data: { message: block.text },
            })
          }
        }

        messages.push({ role: 'assistant', content: assistantContent })

        if (hasToolUse) {
          messages.push({ role: 'user', content: toolResults })
        }

        // Check if agent is done
        if (response.stop_reason === 'end_turn' && !hasToolUse) {
          const textContent = response.content.find((b) => b.type === 'text')
          const summary = textContent && 'text' in textContent ? textContent.text : 'Task completed'

          const result: AgentResult = {
            success: true,
            summary,
            changes,
            toolsUsed,
            iterations,
          }

          await this.emit({
            type: 'completed',
            timestamp: Date.now(),
            data: { result },
          })

          return result
        }
      }

      // Max iterations reached
      const result: AgentResult = {
        success: false,
        summary: 'Maximum iterations reached without completion',
        changes,
        toolsUsed,
        iterations,
        error: `Exceeded max iterations (${context.maxIterations})`,
      }

      await this.emit({
        type: 'failed',
        timestamp: Date.now(),
        data: { result, error: result.error },
      })

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      const result: AgentResult = {
        success: false,
        summary: `Agent failed: ${errorMessage}`,
        changes,
        toolsUsed,
        iterations,
        error: errorMessage,
      }

      await this.emit({
        type: 'failed',
        timestamp: Date.now(),
        data: { result, error: errorMessage },
      })

      return result
    }
  }

  protected abstract buildSystemPrompt(context: AgentContext): string
  protected abstract buildInitialPrompt(context: AgentContext): string

  protected buildToolDefinitions(tools: Map<string, Tool>): Anthropic.Tool[] {
    return Array.from(tools.values()).map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema as Anthropic.Tool.InputSchema,
    }))
  }

  protected async executeTool(
    tool: Tool,
    input: unknown,
    _context: AgentContext
  ): Promise<ToolResult> {
    try {
      if (tool.validate) {
        const validation = tool.validate(input)
        if (!validation.valid) {
          return {
            success: false,
            output: '',
            error: `Validation failed: ${validation.errors?.join(', ')}`,
          }
        }
      }

      return await tool.execute(input)
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  protected isFileModifyingTool(toolName: string): boolean {
    return ['writeFile', 'editFile', 'deleteFile', 'createFile'].includes(toolName)
  }

  protected extractFileChange(
    toolName: string,
    input: Record<string, unknown>,
    result: ToolResult
  ): FileChange | null {
    if (!result.success) return null

    const path = input.path as string | undefined
    if (!path) return null

    switch (toolName) {
      case 'writeFile':
      case 'createFile':
        return { path, type: 'created' }
      case 'editFile':
        return { path, type: 'modified' }
      case 'deleteFile':
        return { path, type: 'deleted' }
      default:
        return null
    }
  }

  protected generateId(): string {
    return `${this.metadata.role}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  }
}
