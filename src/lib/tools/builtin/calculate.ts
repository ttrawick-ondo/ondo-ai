/**
 * Calculate Tool
 * Performs mathematical calculations safely
 */

import { createTool } from '../registry'
import type { ToolResult } from '@/types/tools'

// Safe math operations without eval
const OPERATIONS: Record<string, (a: number, b: number) => number> = {
  add: (a, b) => a + b,
  subtract: (a, b) => a - b,
  multiply: (a, b) => a * b,
  divide: (a, b) => a / b,
  power: (a, b) => Math.pow(a, b),
  modulo: (a, b) => a % b,
  sqrt: (a) => Math.sqrt(a),
  log: (a) => Math.log(a),
  log10: (a) => Math.log10(a),
  sin: (a) => Math.sin(a),
  cos: (a) => Math.cos(a),
  tan: (a) => Math.tan(a),
  abs: (a) => Math.abs(a),
  round: (a) => Math.round(a),
  floor: (a) => Math.floor(a),
  ceil: (a) => Math.ceil(a),
}

export const calculateTool = createTool(
  'calculate',
  'Perform mathematical calculations. Supports basic arithmetic and common math functions.',
  {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        enum: Object.keys(OPERATIONS),
        description: 'The mathematical operation to perform.',
      },
      a: {
        type: 'number',
        description: 'First number (required for all operations).',
      },
      b: {
        type: 'number',
        description: 'Second number (required for binary operations like add, subtract, multiply, divide, power, modulo).',
      },
    },
    required: ['operation', 'a'],
  },
  async (args): Promise<ToolResult> => {
    try {
      const operation = args.operation as string
      const a = args.a as number
      const b = args.b as number | undefined

      if (!OPERATIONS[operation]) {
        return {
          success: false,
          output: '',
          error: `Unknown operation: ${operation}. Available: ${Object.keys(OPERATIONS).join(', ')}`,
        }
      }

      // Check for binary operations that require 'b'
      const binaryOps = ['add', 'subtract', 'multiply', 'divide', 'power', 'modulo']
      if (binaryOps.includes(operation) && b === undefined) {
        return {
          success: false,
          output: '',
          error: `Operation "${operation}" requires two numbers (a and b)`,
        }
      }

      // Check for division by zero
      if (operation === 'divide' && b === 0) {
        return {
          success: false,
          output: '',
          error: 'Cannot divide by zero',
        }
      }

      const result = OPERATIONS[operation](a, b ?? 0)

      // Check for NaN or Infinity
      if (!Number.isFinite(result)) {
        return {
          success: false,
          output: '',
          error: `Result is not a finite number: ${result}`,
        }
      }

      return {
        success: true,
        output: String(result),
        metadata: {
          operation,
          operands: b !== undefined ? [a, b] : [a],
          result,
        },
      }
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : 'Calculation failed',
      }
    }
  }
)
