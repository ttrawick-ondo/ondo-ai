/**
 * Built-in Tools Index
 * Exports all built-in tools and provides registration utility
 */

import { toolRegistry } from '../registry'
import { getCurrentTimeTool } from './get-current-time'
import { calculateTool } from './calculate'
import { webSearchTool } from './web-search'
import { generateImageTool } from './generate-image'
import { gleanSearchTool } from './glean-search'
import { executeActionTool } from './execute-action'

// Export individual tools
export { getCurrentTimeTool } from './get-current-time'
export { calculateTool } from './calculate'
export { webSearchTool } from './web-search'
export { generateImageTool } from './generate-image'
export { gleanSearchTool } from './glean-search'
export { executeActionTool } from './execute-action'

// All built-in tools
export const builtinTools = [
  getCurrentTimeTool,
  calculateTool,
  webSearchTool,
  generateImageTool,
  gleanSearchTool,
  executeActionTool,
]

/**
 * Register all built-in tools with the registry
 */
export function registerBuiltinTools(): void {
  for (const tool of builtinTools) {
    toolRegistry.register(tool)
  }
}

/**
 * Get the names of all built-in tools
 */
export function getBuiltinToolNames(): string[] {
  return builtinTools.map((t) => t.name)
}
