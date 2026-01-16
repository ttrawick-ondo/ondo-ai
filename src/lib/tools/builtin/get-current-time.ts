/**
 * Get Current Time Tool
 * Returns the current date and time in various formats
 */

import { createTool } from '../registry'
import type { ToolResult } from '@/types/tools'

export const getCurrentTimeTool = createTool(
  'get_current_time',
  'Get the current date and time. Useful for time-sensitive queries.',
  {
    type: 'object',
    properties: {
      timezone: {
        type: 'string',
        description: 'Timezone in IANA format (e.g., "America/New_York", "Europe/London"). Defaults to UTC.',
      },
      format: {
        type: 'string',
        enum: ['iso', 'readable', 'unix'],
        description: 'Output format: "iso" for ISO 8601, "readable" for human-readable, "unix" for Unix timestamp.',
      },
    },
    required: [],
  },
  async (args): Promise<ToolResult> => {
    try {
      const timezone = (args.timezone as string) || 'UTC'
      const format = (args.format as string) || 'readable'

      const now = new Date()

      let output: string
      const metadata: Record<string, unknown> = {
        timezone,
        timestamp: now.getTime(),
      }

      switch (format) {
        case 'iso':
          output = now.toISOString()
          break
        case 'unix':
          output = String(Math.floor(now.getTime() / 1000))
          break
        case 'readable':
        default:
          try {
            output = now.toLocaleString('en-US', {
              timeZone: timezone,
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              timeZoneName: 'short',
            })
          } catch {
            // Invalid timezone, fall back to UTC
            output = now.toLocaleString('en-US', {
              timeZone: 'UTC',
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              timeZoneName: 'short',
            })
            metadata.warning = `Invalid timezone "${timezone}", using UTC`
          }
          break
      }

      return {
        success: true,
        output,
        metadata,
      }
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : 'Failed to get current time',
      }
    }
  }
)
