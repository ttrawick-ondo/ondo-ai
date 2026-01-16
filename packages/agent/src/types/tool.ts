import { z } from 'zod'

export type JSONSchemaType =
  | 'string'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'array'
  | 'object'
  | 'null'

export interface JSONSchema {
  type: JSONSchemaType | JSONSchemaType[]
  description?: string
  properties?: Record<string, JSONSchema>
  required?: string[]
  items?: JSONSchema
  enum?: (string | number | boolean | null)[]
  default?: unknown
  minimum?: number
  maximum?: number
  minLength?: number
  maxLength?: number
  pattern?: string
  additionalProperties?: boolean | JSONSchema
}

export interface ToolDefinition {
  name: string
  description: string
  inputSchema: JSONSchema
  requiresApproval?: boolean
  category?: ToolCategory
}

export type ToolCategory =
  | 'file'
  | 'test'
  | 'lint'
  | 'git'
  | 'analysis'
  | 'shell'
  | 'search'

export interface ToolResult {
  success: boolean
  output: string
  error?: string
  metadata?: Record<string, unknown>
}

export interface Tool extends ToolDefinition {
  execute(input: unknown): Promise<ToolResult>
  validate?(input: unknown): { valid: boolean; errors?: string[] }
}

export interface ToolRegistry {
  register(tool: Tool): void
  unregister(name: string): void
  get(name: string): Tool | undefined
  getAll(): Tool[]
  getByCategory(category: ToolCategory): Tool[]
  has(name: string): boolean
}

export interface ToolExecutionContext {
  workingDirectory: string
  dryRun: boolean
  verbose: boolean
  timeout: number
}

export interface ToolCallRequest {
  name: string
  input: unknown
  context: ToolExecutionContext
}

export interface ToolCallResult {
  request: ToolCallRequest
  result: ToolResult
  duration: number
  timestamp: number
}

// Common tool input schemas
export const FilePathInputSchema = z.object({
  path: z.string().describe('The file path relative to the working directory'),
})

export const FileContentInputSchema = z.object({
  path: z.string().describe('The file path relative to the working directory'),
  content: z.string().describe('The content to write to the file'),
})

export const GlobPatternInputSchema = z.object({
  pattern: z.string().describe('Glob pattern to match files'),
  cwd: z.string().optional().describe('Working directory for the glob'),
})

export const CommandInputSchema = z.object({
  command: z.string().describe('The command to execute'),
  args: z.array(z.string()).optional().describe('Command arguments'),
  cwd: z.string().optional().describe('Working directory'),
  timeout: z.number().optional().describe('Timeout in milliseconds'),
})

export type FilePathInput = z.infer<typeof FilePathInputSchema>
export type FileContentInput = z.infer<typeof FileContentInputSchema>
export type GlobPatternInput = z.infer<typeof GlobPatternInputSchema>
export type CommandInput = z.infer<typeof CommandInputSchema>
