import { spawn } from 'node:child_process'
import type { Tool, ToolResult } from '../types/index.js'

interface LintIssue {
  file: string
  line: number
  column: number
  severity: 'error' | 'warning'
  message: string
  ruleId: string | null
}

interface TypeCheckIssue {
  file: string
  line: number
  column: number
  message: string
  code: number
}

function runCommand(
  command: string,
  args: string[],
  cwd: string,
  timeout = 120000
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    const proc = spawn(command, args, {
      cwd,
      shell: true,
      env: { ...process.env, FORCE_COLOR: '0' },
    })

    let stdout = ''
    let stderr = ''

    proc.stdout?.on('data', (data) => {
      stdout += data.toString()
    })

    proc.stderr?.on('data', (data) => {
      stderr += data.toString()
    })

    const timer = setTimeout(() => {
      proc.kill('SIGTERM')
      resolve({
        stdout,
        stderr: stderr + '\nProcess timed out',
        exitCode: 124,
      })
    }, timeout)

    proc.on('close', (code) => {
      clearTimeout(timer)
      resolve({
        stdout,
        stderr,
        exitCode: code ?? 1,
      })
    })

    proc.on('error', (error) => {
      clearTimeout(timer)
      resolve({
        stdout,
        stderr: error.message,
        exitCode: 1,
      })
    })
  })
}

export function createLinterTools(workingDirectory: string): Tool[] {
  const runEslint: Tool = {
    name: 'runEslint',
    description: 'Run ESLint on the specified files or directories',
    category: 'lint',
    inputSchema: {
      type: 'object',
      properties: {
        paths: {
          type: 'array',
          items: { type: 'string' },
          description: 'Files or directories to lint (default: src)',
        },
        fix: {
          type: 'boolean',
          description: 'Automatically fix problems',
          default: false,
        },
        format: {
          type: 'string',
          description: 'Output format (json, stylish, compact)',
          default: 'stylish',
        },
        maxWarnings: {
          type: 'number',
          description: 'Maximum number of warnings before failing',
          default: -1,
        },
      },
      required: [],
    },
    async execute(input: unknown): Promise<ToolResult> {
      const {
        paths = ['src'],
        fix = false,
        format = 'json',
        maxWarnings = -1,
      } = input as {
        paths?: string[]
        fix?: boolean
        format?: string
        maxWarnings?: number
      }

      const args = ['eslint', ...paths, '--format', format]
      if (fix) args.push('--fix')
      if (maxWarnings >= 0) args.push('--max-warnings', maxWarnings.toString())
      args.push('--ext', '.ts,.tsx,.js,.jsx')

      try {
        const result = await runCommand('npx', args, workingDirectory)

        // Parse JSON output if using json format
        let issues: LintIssue[] = []
        if (format === 'json') {
          try {
            const parsed = JSON.parse(result.stdout)
            issues = parsed.flatMap((file: { filePath: string; messages: Array<{ line: number; column: number; severity: number; message: string; ruleId: string | null }> }) =>
              file.messages.map((msg: { line: number; column: number; severity: number; message: string; ruleId: string | null }) => ({
                file: file.filePath,
                line: msg.line,
                column: msg.column,
                severity: msg.severity === 2 ? 'error' : 'warning',
                message: msg.message,
                ruleId: msg.ruleId,
              }))
            )
          } catch {
            // JSON parsing failed
          }
        }

        const errorCount = issues.filter((i) => i.severity === 'error').length
        const warningCount = issues.filter((i) => i.severity === 'warning').length

        return {
          success: result.exitCode === 0,
          output:
            format === 'json'
              ? issues.map((i) => `${i.file}:${i.line}:${i.column} ${i.severity} ${i.message} (${i.ruleId})`).join('\n') || 'No issues found'
              : result.stdout || 'No issues found',
          metadata: {
            errorCount,
            warningCount,
            totalIssues: issues.length,
          },
        }
      } catch (error) {
        return {
          success: false,
          output: '',
          error: error instanceof Error ? error.message : 'Failed to run ESLint',
        }
      }
    },
  }

  const runTypeCheck: Tool = {
    name: 'runTypeCheck',
    description: 'Run TypeScript type checking without emitting files',
    category: 'lint',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'string',
          description: 'Path to tsconfig.json file',
          default: 'tsconfig.json',
        },
      },
      required: [],
    },
    async execute(input: unknown): Promise<ToolResult> {
      const { project = 'tsconfig.json' } = input as { project?: string }

      const args = ['tsc', '--noEmit', '--project', project]

      try {
        const result = await runCommand('npx', args, workingDirectory)

        // Parse TypeScript errors
        const issues: TypeCheckIssue[] = []
        const lines = (result.stdout + result.stderr).split('\n')

        for (const line of lines) {
          const match = line.match(/^(.+)\((\d+),(\d+)\): error TS(\d+): (.+)$/)
          if (match) {
            issues.push({
              file: match[1],
              line: parseInt(match[2], 10),
              column: parseInt(match[3], 10),
              code: parseInt(match[4], 10),
              message: match[5],
            })
          }
        }

        const success = result.exitCode === 0

        return {
          success,
          output:
            issues.length > 0
              ? issues.map((i) => `${i.file}:${i.line}:${i.column} TS${i.code}: ${i.message}`).join('\n')
              : success
                ? 'No type errors found'
                : result.stdout || result.stderr,
          metadata: {
            errorCount: issues.length,
          },
        }
      } catch (error) {
        return {
          success: false,
          output: '',
          error: error instanceof Error ? error.message : 'Failed to run type check',
        }
      }
    },
  }

  const formatCode: Tool = {
    name: 'formatCode',
    description: 'Format code using Prettier',
    category: 'lint',
    inputSchema: {
      type: 'object',
      properties: {
        paths: {
          type: 'array',
          items: { type: 'string' },
          description: 'Files or patterns to format',
        },
        check: {
          type: 'boolean',
          description: 'Check if files are formatted without modifying them',
          default: false,
        },
      },
      required: [],
    },
    async execute(input: unknown): Promise<ToolResult> {
      const { paths = ['src/**/*.{ts,tsx}'], check = false } = input as {
        paths?: string[]
        check?: boolean
      }

      const args = ['prettier', ...(check ? ['--check'] : ['--write']), ...paths]

      try {
        const result = await runCommand('npx', args, workingDirectory)
        return {
          success: result.exitCode === 0,
          output: result.stdout || (result.exitCode === 0 ? 'All files formatted' : result.stderr),
        }
      } catch (error) {
        return {
          success: false,
          output: '',
          error: error instanceof Error ? error.message : 'Failed to format code',
        }
      }
    },
  }

  const runNextLint: Tool = {
    name: 'runNextLint',
    description: 'Run Next.js linting (next lint)',
    category: 'lint',
    inputSchema: {
      type: 'object',
      properties: {
        fix: {
          type: 'boolean',
          description: 'Automatically fix problems',
          default: false,
        },
        strict: {
          type: 'boolean',
          description: 'Use strict mode',
          default: false,
        },
      },
      required: [],
    },
    async execute(input: unknown): Promise<ToolResult> {
      const { fix = false, strict = false } = input as {
        fix?: boolean
        strict?: boolean
      }

      const args = ['next', 'lint']
      if (fix) args.push('--fix')
      if (strict) args.push('--strict')

      try {
        const result = await runCommand('npx', args, workingDirectory)
        return {
          success: result.exitCode === 0,
          output: result.stdout || result.stderr || 'Linting complete',
        }
      } catch (error) {
        return {
          success: false,
          output: '',
          error: error instanceof Error ? error.message : 'Failed to run Next.js lint',
        }
      }
    },
  }

  const checkImports: Tool = {
    name: 'checkImports',
    description: 'Check for unused or missing imports',
    category: 'lint',
    inputSchema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          description: 'File to check',
        },
      },
      required: ['file'],
    },
    async execute(input: unknown): Promise<ToolResult> {
      const { file } = input as { file: string }

      // Use ESLint with specific rules
      const args = [
        'eslint',
        file,
        '--format',
        'json',
        '--rule',
        '{"no-unused-vars": "error", "@typescript-eslint/no-unused-vars": "error", "import/no-unresolved": "error"}',
      ]

      try {
        const result = await runCommand('npx', args, workingDirectory)

        let issues: LintIssue[] = []
        try {
          const parsed = JSON.parse(result.stdout)
          issues = parsed.flatMap((f: { filePath: string; messages: Array<{ line: number; column: number; severity: number; message: string; ruleId: string | null }> }) =>
            f.messages
              .filter((m: { ruleId: string | null }) => m.ruleId?.includes('unused') || m.ruleId?.includes('unresolved'))
              .map((m: { line: number; column: number; severity: number; message: string; ruleId: string | null }) => ({
                file: f.filePath,
                line: m.line,
                column: m.column,
                severity: m.severity === 2 ? 'error' : 'warning',
                message: m.message,
                ruleId: m.ruleId,
              }))
          )
        } catch {
          // Parsing failed
        }

        return {
          success: result.exitCode === 0 || issues.length === 0,
          output:
            issues.length > 0
              ? issues.map((i) => `${i.line}:${i.column} ${i.message}`).join('\n')
              : 'No import issues found',
          metadata: { issueCount: issues.length },
        }
      } catch (error) {
        return {
          success: false,
          output: '',
          error: error instanceof Error ? error.message : 'Failed to check imports',
        }
      }
    },
  }

  return [runEslint, runTypeCheck, formatCode, runNextLint, checkImports]
}
