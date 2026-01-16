import { spawn } from 'node:child_process'
import type { Tool, ToolResult } from '../types/index.js'

interface GitStatus {
  staged: string[]
  unstaged: string[]
  untracked: string[]
  branch: string
  ahead: number
  behind: number
}

interface GitLogEntry {
  hash: string
  shortHash: string
  author: string
  date: string
  message: string
}

function runGit(
  args: string[],
  cwd: string,
  timeout = 30000
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    const proc = spawn('git', args, {
      cwd,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
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

export function createGitOpsTools(workingDirectory: string): Tool[] {
  const gitStatus: Tool = {
    name: 'gitStatus',
    description: 'Get the current git status including staged, unstaged, and untracked files',
    category: 'git',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
    async execute(): Promise<ToolResult> {
      try {
        const [statusResult, branchResult] = await Promise.all([
          runGit(['status', '--porcelain'], workingDirectory),
          runGit(['branch', '-vv', '--no-color'], workingDirectory),
        ])

        if (statusResult.exitCode !== 0) {
          return {
            success: false,
            output: '',
            error: statusResult.stderr || 'Failed to get git status',
          }
        }

        const status: GitStatus = {
          staged: [],
          unstaged: [],
          untracked: [],
          branch: '',
          ahead: 0,
          behind: 0,
        }

        // Parse status
        const lines = statusResult.stdout.split('\n').filter((l) => l.trim())
        for (const line of lines) {
          const indexStatus = line[0]
          const workTreeStatus = line[1]
          const file = line.substring(3)

          if (indexStatus === '?' && workTreeStatus === '?') {
            status.untracked.push(file)
          } else {
            if (indexStatus !== ' ' && indexStatus !== '?') {
              status.staged.push(file)
            }
            if (workTreeStatus !== ' ' && workTreeStatus !== '?') {
              status.unstaged.push(file)
            }
          }
        }

        // Parse branch info
        const currentBranchLine = branchResult.stdout
          .split('\n')
          .find((l) => l.startsWith('*'))
        if (currentBranchLine) {
          const branchMatch = currentBranchLine.match(/^\* (\S+)/)
          if (branchMatch) {
            status.branch = branchMatch[1]
          }

          const aheadMatch = currentBranchLine.match(/ahead (\d+)/)
          const behindMatch = currentBranchLine.match(/behind (\d+)/)
          if (aheadMatch) status.ahead = parseInt(aheadMatch[1], 10)
          if (behindMatch) status.behind = parseInt(behindMatch[1], 10)
        }

        const summary = [
          `Branch: ${status.branch}`,
          `Staged: ${status.staged.length} file(s)`,
          `Unstaged: ${status.unstaged.length} file(s)`,
          `Untracked: ${status.untracked.length} file(s)`,
        ].join('\n')

        return {
          success: true,
          output: summary,
          metadata: status as unknown as Record<string, unknown>,
        }
      } catch (error) {
        return {
          success: false,
          output: '',
          error: error instanceof Error ? error.message : 'Failed to get git status',
        }
      }
    },
  }

  const gitDiff: Tool = {
    name: 'gitDiff',
    description: 'Get the diff of changes in the repository',
    category: 'git',
    inputSchema: {
      type: 'object',
      properties: {
        staged: {
          type: 'boolean',
          description: 'Show staged changes only',
          default: false,
        },
        file: {
          type: 'string',
          description: 'Specific file to diff',
        },
        base: {
          type: 'string',
          description: 'Base commit/branch to compare against',
        },
      },
      required: [],
    },
    async execute(input: unknown): Promise<ToolResult> {
      const { staged = false, file, base } = input as {
        staged?: boolean
        file?: string
        base?: string
      }

      const args = ['diff']
      if (staged) args.push('--staged')
      if (base) args.push(base)
      if (file) args.push('--', file)

      try {
        const result = await runGit(args, workingDirectory)
        return {
          success: result.exitCode === 0,
          output: result.stdout || 'No changes',
        }
      } catch (error) {
        return {
          success: false,
          output: '',
          error: error instanceof Error ? error.message : 'Failed to get diff',
        }
      }
    },
  }

  const gitLog: Tool = {
    name: 'gitLog',
    description: 'Get the commit history',
    category: 'git',
    inputSchema: {
      type: 'object',
      properties: {
        count: {
          type: 'number',
          description: 'Number of commits to show',
          default: 10,
        },
        file: {
          type: 'string',
          description: 'Show history for specific file',
        },
        oneline: {
          type: 'boolean',
          description: 'Show one line per commit',
          default: true,
        },
      },
      required: [],
    },
    async execute(input: unknown): Promise<ToolResult> {
      const { count = 10, file, oneline = true } = input as {
        count?: number
        file?: string
        oneline?: boolean
      }

      const format = oneline
        ? '--format=%h %s (%an, %ar)'
        : '--format=%H%n%an%n%ai%n%s%n'

      const args = ['log', `-${count}`, format]
      if (file) args.push('--', file)

      try {
        const result = await runGit(args, workingDirectory)

        if (!oneline && result.exitCode === 0) {
          const entries: GitLogEntry[] = []
          const chunks = result.stdout.split('\n\n').filter((c) => c.trim())
          for (const chunk of chunks) {
            const lines = chunk.split('\n')
            if (lines.length >= 4) {
              entries.push({
                hash: lines[0],
                shortHash: lines[0].substring(0, 7),
                author: lines[1],
                date: lines[2],
                message: lines[3],
              })
            }
          }
          return {
            success: true,
            output: result.stdout,
            metadata: { entries },
          }
        }

        return {
          success: result.exitCode === 0,
          output: result.stdout || 'No commits found',
        }
      } catch (error) {
        return {
          success: false,
          output: '',
          error: error instanceof Error ? error.message : 'Failed to get log',
        }
      }
    },
  }

  const gitAdd: Tool = {
    name: 'gitAdd',
    description: 'Stage files for commit',
    category: 'git',
    requiresApproval: false,
    inputSchema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: { type: 'string' },
          description: 'Files to stage (use "." for all)',
        },
      },
      required: ['files'],
    },
    async execute(input: unknown): Promise<ToolResult> {
      const { files } = input as { files: string[] }

      try {
        const result = await runGit(['add', ...files], workingDirectory)
        return {
          success: result.exitCode === 0,
          output: result.exitCode === 0 ? `Staged: ${files.join(', ')}` : result.stderr,
          error: result.exitCode !== 0 ? result.stderr : undefined,
        }
      } catch (error) {
        return {
          success: false,
          output: '',
          error: error instanceof Error ? error.message : 'Failed to stage files',
        }
      }
    },
  }

  const gitCommit: Tool = {
    name: 'gitCommit',
    description: 'Create a commit with the staged changes',
    category: 'git',
    requiresApproval: true,
    inputSchema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'Commit message',
        },
        amend: {
          type: 'boolean',
          description: 'Amend the previous commit',
          default: false,
        },
      },
      required: ['message'],
    },
    async execute(input: unknown): Promise<ToolResult> {
      const { message, amend = false } = input as {
        message: string
        amend?: boolean
      }

      const args = ['commit', '-m', message]
      if (amend) args.push('--amend')

      try {
        const result = await runGit(args, workingDirectory)
        return {
          success: result.exitCode === 0,
          output: result.stdout || result.stderr,
          error: result.exitCode !== 0 ? result.stderr : undefined,
        }
      } catch (error) {
        return {
          success: false,
          output: '',
          error: error instanceof Error ? error.message : 'Failed to commit',
        }
      }
    },
  }

  const gitBranch: Tool = {
    name: 'gitBranch',
    description: 'List, create, or delete branches',
    category: 'git',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Branch name to create',
        },
        delete: {
          type: 'boolean',
          description: 'Delete the branch',
          default: false,
        },
        list: {
          type: 'boolean',
          description: 'List all branches',
          default: true,
        },
      },
      required: [],
    },
    async execute(input: unknown): Promise<ToolResult> {
      const { name, delete: del = false, list = true } = input as {
        name?: string
        delete?: boolean
        list?: boolean
      }

      let args: string[]
      if (name && del) {
        args = ['branch', '-d', name]
      } else if (name) {
        args = ['branch', name]
      } else if (list) {
        args = ['branch', '-a', '--no-color']
      } else {
        return {
          success: false,
          output: '',
          error: 'No operation specified',
        }
      }

      try {
        const result = await runGit(args, workingDirectory)
        return {
          success: result.exitCode === 0,
          output: result.stdout || result.stderr,
          error: result.exitCode !== 0 ? result.stderr : undefined,
        }
      } catch (error) {
        return {
          success: false,
          output: '',
          error: error instanceof Error ? error.message : 'Failed to manage branch',
        }
      }
    },
  }

  const gitCheckout: Tool = {
    name: 'gitCheckout',
    description: 'Switch branches or restore files',
    category: 'git',
    requiresApproval: true,
    inputSchema: {
      type: 'object',
      properties: {
        target: {
          type: 'string',
          description: 'Branch name or file path',
        },
        createBranch: {
          type: 'boolean',
          description: 'Create a new branch',
          default: false,
        },
      },
      required: ['target'],
    },
    async execute(input: unknown): Promise<ToolResult> {
      const { target, createBranch = false } = input as {
        target: string
        createBranch?: boolean
      }

      const args = ['checkout']
      if (createBranch) args.push('-b')
      args.push(target)

      try {
        const result = await runGit(args, workingDirectory)
        return {
          success: result.exitCode === 0,
          output: result.stdout || `Switched to ${target}`,
          error: result.exitCode !== 0 ? result.stderr : undefined,
        }
      } catch (error) {
        return {
          success: false,
          output: '',
          error: error instanceof Error ? error.message : 'Failed to checkout',
        }
      }
    },
  }

  const gitStash: Tool = {
    name: 'gitStash',
    description: 'Stash or restore changes',
    category: 'git',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['push', 'pop', 'list', 'drop'],
          description: 'Stash action',
          default: 'push',
        },
        message: {
          type: 'string',
          description: 'Stash message (for push)',
        },
      },
      required: [],
    },
    async execute(input: unknown): Promise<ToolResult> {
      const { action = 'push', message } = input as {
        action?: string
        message?: string
      }

      const args = ['stash', action]
      if (action === 'push' && message) {
        args.push('-m', message)
      }

      try {
        const result = await runGit(args, workingDirectory)
        return {
          success: result.exitCode === 0,
          output: result.stdout || result.stderr || 'Stash operation completed',
        }
      } catch (error) {
        return {
          success: false,
          output: '',
          error: error instanceof Error ? error.message : 'Failed to stash',
        }
      }
    },
  }

  const gitShow: Tool = {
    name: 'gitShow',
    description: 'Show details of a commit or file at a specific commit',
    category: 'git',
    inputSchema: {
      type: 'object',
      properties: {
        ref: {
          type: 'string',
          description: 'Commit hash or reference',
          default: 'HEAD',
        },
        file: {
          type: 'string',
          description: 'Specific file to show',
        },
      },
      required: [],
    },
    async execute(input: unknown): Promise<ToolResult> {
      const { ref = 'HEAD', file } = input as {
        ref?: string
        file?: string
      }

      const args = ['show', file ? `${ref}:${file}` : ref]

      try {
        const result = await runGit(args, workingDirectory)
        return {
          success: result.exitCode === 0,
          output: result.stdout,
          error: result.exitCode !== 0 ? result.stderr : undefined,
        }
      } catch (error) {
        return {
          success: false,
          output: '',
          error: error instanceof Error ? error.message : 'Failed to show',
        }
      }
    },
  }

  return [
    gitStatus,
    gitDiff,
    gitLog,
    gitAdd,
    gitCommit,
    gitBranch,
    gitCheckout,
    gitStash,
    gitShow,
  ]
}
