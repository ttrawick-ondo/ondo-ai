import type { AgentRole, AutonomyLevel, AgentConfig } from './config.js'
import type { Task } from './task.js'
import type { Tool, ToolResult } from './tool.js'

export interface AgentContext {
  config: AgentConfig
  task: Task
  tools: Map<string, Tool>
  workingDirectory: string
  conversationHistory: ConversationMessage[]
  iteration: number
  maxIterations: number
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  toolUse?: ToolUseRecord[]
  timestamp: number
}

export interface ToolUseRecord {
  toolName: string
  input: unknown
  result: ToolResult
  timestamp: number
}

export interface AgentResult {
  success: boolean
  summary: string
  changes: FileChange[]
  toolsUsed: ToolUseRecord[]
  iterations: number
  error?: string
}

export interface FileChange {
  path: string
  type: 'created' | 'modified' | 'deleted'
  diff?: string
}

export interface AgentCapabilities {
  canReadFiles: boolean
  canWriteFiles: boolean
  canExecuteCommands: boolean
  canModifyTests: boolean
  canModifySource: boolean
  canCommit: boolean
}

export interface AgentMetadata {
  role: AgentRole
  name: string
  description: string
  autonomyLevel: AutonomyLevel
  capabilities: AgentCapabilities
}

export interface BaseAgent {
  readonly metadata: AgentMetadata
  execute(context: AgentContext): Promise<AgentResult>
  planExecution(context: AgentContext): Promise<ExecutionPlan>
  validateResult(result: AgentResult): Promise<ValidationResult>
}

export interface ExecutionPlan {
  steps: ExecutionStep[]
  estimatedToolCalls: number
  requiresApproval: boolean
  risks: string[]
}

export interface ExecutionStep {
  id: string
  description: string
  toolName?: string
  dependsOn: string[]
  optional: boolean
}

export interface ValidationResult {
  valid: boolean
  issues: ValidationIssue[]
  suggestions: string[]
}

export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info'
  message: string
  file?: string
  line?: number
}

export type AgentEventType =
  | 'started'
  | 'iteration_start'
  | 'tool_call'
  | 'tool_result'
  | 'thinking'
  | 'awaiting_approval'
  | 'approved'
  | 'rejected'
  | 'completed'
  | 'failed'

export interface AgentEvent {
  type: AgentEventType
  timestamp: number
  data: AgentEventData
}

export interface AgentEventData {
  message?: string
  iteration?: number
  toolName?: string
  toolInput?: unknown
  toolResult?: ToolResult
  plan?: ExecutionPlan
  result?: AgentResult
  error?: string
}

export type AgentEventHandler = (event: AgentEvent) => void | Promise<void>
