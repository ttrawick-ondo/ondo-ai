import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { glob } from 'glob'
import type { Tool, ToolResult } from '../types/index.js'

export function createFileOpsTools(workingDirectory: string): Tool[] {
  const resolvePath = (filePath: string): string => {
    if (path.isAbsolute(filePath)) {
      return filePath
    }
    return path.resolve(workingDirectory, filePath)
  }

  const readFile: Tool = {
    name: 'readFile',
    description: 'Read the contents of a file at the specified path',
    category: 'file',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The file path relative to the working directory',
        },
        encoding: {
          type: 'string',
          description: 'File encoding (default: utf-8)',
          default: 'utf-8',
        },
      },
      required: ['path'],
    },
    async execute(input: unknown): Promise<ToolResult> {
      const { path: filePath, encoding = 'utf-8' } = input as {
        path: string
        encoding?: BufferEncoding
      }

      try {
        const fullPath = resolvePath(filePath)
        const content = await fs.readFile(fullPath, encoding)
        return {
          success: true,
          output: content,
          metadata: { path: fullPath, size: content.length },
        }
      } catch (error) {
        return {
          success: false,
          output: '',
          error: error instanceof Error ? error.message : 'Failed to read file',
        }
      }
    },
  }

  const writeFile: Tool = {
    name: 'writeFile',
    description: 'Write content to a file, creating it if it does not exist',
    category: 'file',
    requiresApproval: false,
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The file path relative to the working directory',
        },
        content: {
          type: 'string',
          description: 'The content to write to the file',
        },
        createDirectories: {
          type: 'boolean',
          description: 'Create parent directories if they do not exist',
          default: true,
        },
      },
      required: ['path', 'content'],
    },
    async execute(input: unknown): Promise<ToolResult> {
      const { path: filePath, content, createDirectories = true } = input as {
        path: string
        content: string
        createDirectories?: boolean
      }

      try {
        const fullPath = resolvePath(filePath)

        if (createDirectories) {
          await fs.mkdir(path.dirname(fullPath), { recursive: true })
        }

        await fs.writeFile(fullPath, content, 'utf-8')
        return {
          success: true,
          output: `Successfully wrote ${content.length} bytes to ${filePath}`,
          metadata: { path: fullPath, size: content.length },
        }
      } catch (error) {
        return {
          success: false,
          output: '',
          error: error instanceof Error ? error.message : 'Failed to write file',
        }
      }
    },
  }

  const editFile: Tool = {
    name: 'editFile',
    description: 'Edit a file by replacing a specific string with new content',
    category: 'file',
    requiresApproval: false,
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The file path relative to the working directory',
        },
        oldContent: {
          type: 'string',
          description: 'The exact content to search for and replace',
        },
        newContent: {
          type: 'string',
          description: 'The new content to replace with',
        },
        replaceAll: {
          type: 'boolean',
          description: 'Replace all occurrences (default: false)',
          default: false,
        },
      },
      required: ['path', 'oldContent', 'newContent'],
    },
    async execute(input: unknown): Promise<ToolResult> {
      const { path: filePath, oldContent, newContent, replaceAll = false } = input as {
        path: string
        oldContent: string
        newContent: string
        replaceAll?: boolean
      }

      try {
        const fullPath = resolvePath(filePath)
        const fileContent = await fs.readFile(fullPath, 'utf-8')

        if (!fileContent.includes(oldContent)) {
          return {
            success: false,
            output: '',
            error: 'The specified content was not found in the file',
          }
        }

        let updatedContent: string
        if (replaceAll) {
          updatedContent = fileContent.split(oldContent).join(newContent)
        } else {
          updatedContent = fileContent.replace(oldContent, newContent)
        }

        await fs.writeFile(fullPath, updatedContent, 'utf-8')
        return {
          success: true,
          output: `Successfully edited ${filePath}`,
          metadata: { path: fullPath },
        }
      } catch (error) {
        return {
          success: false,
          output: '',
          error: error instanceof Error ? error.message : 'Failed to edit file',
        }
      }
    },
  }

  const deleteFile: Tool = {
    name: 'deleteFile',
    description: 'Delete a file at the specified path',
    category: 'file',
    requiresApproval: true,
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The file path relative to the working directory',
        },
      },
      required: ['path'],
    },
    async execute(input: unknown): Promise<ToolResult> {
      const { path: filePath } = input as { path: string }

      try {
        const fullPath = resolvePath(filePath)
        await fs.unlink(fullPath)
        return {
          success: true,
          output: `Successfully deleted ${filePath}`,
          metadata: { path: fullPath },
        }
      } catch (error) {
        return {
          success: false,
          output: '',
          error: error instanceof Error ? error.message : 'Failed to delete file',
        }
      }
    },
  }

  const listFiles: Tool = {
    name: 'listFiles',
    description: 'List files in a directory, optionally filtering by pattern',
    category: 'file',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The directory path (default: working directory)',
          default: '.',
        },
        pattern: {
          type: 'string',
          description: 'Glob pattern to filter files (e.g., "**/*.ts")',
        },
        recursive: {
          type: 'boolean',
          description: 'List files recursively',
          default: false,
        },
      },
      required: [],
    },
    async execute(input: unknown): Promise<ToolResult> {
      const { path: dirPath = '.', pattern, recursive = false } = input as {
        path?: string
        pattern?: string
        recursive?: boolean
      }

      try {
        const fullPath = resolvePath(dirPath)

        if (pattern) {
          const files = await glob(pattern, {
            cwd: fullPath,
            nodir: true,
          })
          return {
            success: true,
            output: files.join('\n'),
            metadata: { count: files.length, pattern },
          }
        }

        if (recursive) {
          const files = await glob('**/*', {
            cwd: fullPath,
            nodir: true,
          })
          return {
            success: true,
            output: files.join('\n'),
            metadata: { count: files.length },
          }
        }

        const entries = await fs.readdir(fullPath, { withFileTypes: true })
        const files = entries
          .filter((e) => e.isFile())
          .map((e) => e.name)
        return {
          success: true,
          output: files.join('\n'),
          metadata: { count: files.length },
        }
      } catch (error) {
        return {
          success: false,
          output: '',
          error: error instanceof Error ? error.message : 'Failed to list files',
        }
      }
    },
  }

  const searchFiles: Tool = {
    name: 'searchFiles',
    description: 'Search for files matching a glob pattern',
    category: 'search',
    inputSchema: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: 'Glob pattern to match files (e.g., "**/*.ts")',
        },
        cwd: {
          type: 'string',
          description: 'Working directory for the search',
        },
        ignore: {
          type: 'array',
          items: { type: 'string' },
          description: 'Patterns to ignore',
        },
      },
      required: ['pattern'],
    },
    async execute(input: unknown): Promise<ToolResult> {
      const { pattern, cwd, ignore = ['node_modules/**', 'dist/**'] } = input as {
        pattern: string
        cwd?: string
        ignore?: string[]
      }

      try {
        const searchPath = cwd ? resolvePath(cwd) : workingDirectory
        const files = await glob(pattern, {
          cwd: searchPath,
          ignore,
          nodir: true,
        })
        return {
          success: true,
          output: files.join('\n'),
          metadata: { count: files.length, pattern },
        }
      } catch (error) {
        return {
          success: false,
          output: '',
          error: error instanceof Error ? error.message : 'Failed to search files',
        }
      }
    },
  }

  const searchContent: Tool = {
    name: 'searchContent',
    description: 'Search for content within files using a regex pattern',
    category: 'search',
    inputSchema: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: 'Regex pattern to search for',
        },
        filePattern: {
          type: 'string',
          description: 'Glob pattern to filter files (default: **/*.ts)',
          default: '**/*.ts',
        },
        maxResults: {
          type: 'number',
          description: 'Maximum number of results to return',
          default: 50,
        },
      },
      required: ['pattern'],
    },
    async execute(input: unknown): Promise<ToolResult> {
      const { pattern, filePattern = '**/*.ts', maxResults = 50 } = input as {
        pattern: string
        filePattern?: string
        maxResults?: number
      }

      try {
        const regex = new RegExp(pattern, 'g')
        const files = await glob(filePattern, {
          cwd: workingDirectory,
          ignore: ['node_modules/**', 'dist/**'],
          nodir: true,
        })

        const results: Array<{ file: string; line: number; content: string }> = []

        for (const file of files) {
          if (results.length >= maxResults) break

          const fullPath = path.resolve(workingDirectory, file)
          const content = await fs.readFile(fullPath, 'utf-8')
          const lines = content.split('\n')

          for (let i = 0; i < lines.length; i++) {
            if (results.length >= maxResults) break
            if (regex.test(lines[i])) {
              results.push({
                file,
                line: i + 1,
                content: lines[i].trim(),
              })
            }
            regex.lastIndex = 0 // Reset regex state
          }
        }

        const output = results
          .map((r) => `${r.file}:${r.line}: ${r.content}`)
          .join('\n')

        return {
          success: true,
          output: output || 'No matches found',
          metadata: { count: results.length, pattern },
        }
      } catch (error) {
        return {
          success: false,
          output: '',
          error: error instanceof Error ? error.message : 'Failed to search content',
        }
      }
    },
  }

  const fileExists: Tool = {
    name: 'fileExists',
    description: 'Check if a file or directory exists at the specified path',
    category: 'file',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The path to check',
        },
      },
      required: ['path'],
    },
    async execute(input: unknown): Promise<ToolResult> {
      const { path: filePath } = input as { path: string }

      try {
        const fullPath = resolvePath(filePath)
        const stats = await fs.stat(fullPath)
        return {
          success: true,
          output: 'true',
          metadata: {
            exists: true,
            isFile: stats.isFile(),
            isDirectory: stats.isDirectory(),
            size: stats.size,
          },
        }
      } catch {
        return {
          success: true,
          output: 'false',
          metadata: { exists: false },
        }
      }
    },
  }

  return [
    readFile,
    writeFile,
    editFile,
    deleteFile,
    listFiles,
    searchFiles,
    searchContent,
    fileExists,
  ]
}
