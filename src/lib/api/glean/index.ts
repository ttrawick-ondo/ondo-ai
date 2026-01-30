/**
 * Glean API Module
 * Exports for Glean search and agent functionality
 *
 * NOTE: Agent creation, update, and deletion are NOT supported via API.
 * Agents must be created and configured via the Glean Agent Builder UI.
 * This module only supports listing, reading, and executing agents.
 *
 * Agent operations are handled by GleanProvider in src/lib/api/providers/glean.ts
 */

export * from './types'
export * from './search'
