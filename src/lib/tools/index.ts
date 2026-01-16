/**
 * Tools Module Index
 * Central export for all tool-related functionality
 */

// Export registry
export { toolRegistry, createTool, ToolRegistry } from './registry'

// Export built-in tools
export {
  builtinTools,
  registerBuiltinTools,
  getBuiltinToolNames,
  getCurrentTimeTool,
  calculateTool,
  webSearchTool,
} from './builtin'

// Re-export types from types/tools
export type {
  ToolDefinition,
  ToolResult,
  ToolCall,
  ToolAPIFormat,
  ParsedToolCall,
  ToolExecutionRecord,
  ToolExecutionOptions,
  FunctionParameters,
} from '@/types/tools'
