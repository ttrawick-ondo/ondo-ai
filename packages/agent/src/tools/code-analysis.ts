import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { glob } from 'glob'
import type { Tool, ToolResult } from '../types/index.js'

interface FunctionInfo {
  name: string
  line: number
  params: string[]
  returnType: string | null
  async: boolean
  exported: boolean
}

interface ClassInfo {
  name: string
  line: number
  extends: string | null
  implements: string[]
  methods: string[]
  properties: string[]
  exported: boolean
}

interface ImportInfo {
  source: string
  defaultImport: string | null
  namedImports: string[]
  namespaceImport: string | null
  line: number
}

interface ExportInfo {
  name: string
  type: 'function' | 'class' | 'variable' | 'type' | 'interface' | 'default'
  line: number
}

interface FileAnalysis {
  imports: ImportInfo[]
  exports: ExportInfo[]
  functions: FunctionInfo[]
  classes: ClassInfo[]
  interfaces: string[]
  types: string[]
  loc: number
  hasDefaultExport: boolean
}

export function createCodeAnalysisTools(workingDirectory: string): Tool[] {
  const resolvePath = (filePath: string): string => {
    if (path.isAbsolute(filePath)) {
      return filePath
    }
    return path.resolve(workingDirectory, filePath)
  }

  const analyzeFile: Tool = {
    name: 'analyzeFile',
    description: 'Analyze a TypeScript/JavaScript file structure including imports, exports, functions, and classes',
    category: 'analysis',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the file to analyze',
        },
      },
      required: ['path'],
    },
    async execute(input: unknown): Promise<ToolResult> {
      const { path: filePath } = input as { path: string }

      try {
        const fullPath = resolvePath(filePath)
        const content = await fs.readFile(fullPath, 'utf-8')
        const lines = content.split('\n')

        const analysis: FileAnalysis = {
          imports: [],
          exports: [],
          functions: [],
          classes: [],
          interfaces: [],
          types: [],
          loc: lines.length,
          hasDefaultExport: false,
        }

        // Parse imports
        const importRegex = /^import\s+(?:(\w+)(?:\s*,\s*)?)?(?:\{([^}]+)\})?(?:\s*\*\s+as\s+(\w+))?\s+from\s+['"]([^'"]+)['"]/gm
        let match: RegExpExecArray | null

        while ((match = importRegex.exec(content)) !== null) {
          const lineNum = content.substring(0, match.index).split('\n').length
          analysis.imports.push({
            defaultImport: match[1] || null,
            namedImports: match[2] ? match[2].split(',').map((s) => s.trim().split(' as ')[0]) : [],
            namespaceImport: match[3] || null,
            source: match[4],
            line: lineNum,
          })
        }

        // Parse exports
        const exportDefaultRegex = /^export\s+default\s+/gm
        while ((match = exportDefaultRegex.exec(content)) !== null) {
          analysis.hasDefaultExport = true
          const lineNum = content.substring(0, match.index).split('\n').length
          analysis.exports.push({
            name: 'default',
            type: 'default',
            line: lineNum,
          })
        }

        const exportNamedRegex = /^export\s+(?:async\s+)?(?:function|const|let|var|class|interface|type)\s+(\w+)/gm
        while ((match = exportNamedRegex.exec(content)) !== null) {
          const lineNum = content.substring(0, match.index).split('\n').length
          const keyword = match[0].includes('function')
            ? 'function'
            : match[0].includes('class')
              ? 'class'
              : match[0].includes('interface')
                ? 'interface'
                : match[0].includes('type')
                  ? 'type'
                  : 'variable'
          analysis.exports.push({
            name: match[1],
            type: keyword,
            line: lineNum,
          })
        }

        // Parse functions
        const functionRegex = /^(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*(?:<[^>]+>)?\s*\(([^)]*)\)(?:\s*:\s*([^{]+))?\s*\{/gm
        while ((match = functionRegex.exec(content)) !== null) {
          const lineNum = content.substring(0, match.index).split('\n').length
          analysis.functions.push({
            name: match[1],
            line: lineNum,
            params: match[2] ? match[2].split(',').map((p) => p.trim().split(':')[0].trim()) : [],
            returnType: match[3]?.trim() || null,
            async: match[0].includes('async'),
            exported: match[0].includes('export'),
          })
        }

        // Parse arrow functions assigned to variables
        const arrowFnRegex = /^(?:export\s+)?(?:const|let|var)\s+(\w+)\s*(?::\s*[^=]+)?\s*=\s*(?:async\s*)?\([^)]*\)\s*(?::\s*[^=]+)?\s*=>/gm
        while ((match = arrowFnRegex.exec(content)) !== null) {
          const lineNum = content.substring(0, match.index).split('\n').length
          analysis.functions.push({
            name: match[1],
            line: lineNum,
            params: [],
            returnType: null,
            async: match[0].includes('async'),
            exported: match[0].includes('export'),
          })
        }

        // Parse classes
        const classRegex = /^(?:export\s+)?(?:abstract\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([^{]+))?\s*\{/gm
        while ((match = classRegex.exec(content)) !== null) {
          const lineNum = content.substring(0, match.index).split('\n').length
          analysis.classes.push({
            name: match[1],
            line: lineNum,
            extends: match[2] || null,
            implements: match[3] ? match[3].split(',').map((s) => s.trim()) : [],
            methods: [],
            properties: [],
            exported: match[0].includes('export'),
          })
        }

        // Parse interfaces
        const interfaceRegex = /^(?:export\s+)?interface\s+(\w+)/gm
        while ((match = interfaceRegex.exec(content)) !== null) {
          analysis.interfaces.push(match[1])
        }

        // Parse type aliases
        const typeRegex = /^(?:export\s+)?type\s+(\w+)/gm
        while ((match = typeRegex.exec(content)) !== null) {
          analysis.types.push(match[1])
        }

        const summary = [
          `File: ${filePath}`,
          `Lines of code: ${analysis.loc}`,
          `Imports: ${analysis.imports.length}`,
          `Exports: ${analysis.exports.length}`,
          `Functions: ${analysis.functions.length}`,
          `Classes: ${analysis.classes.length}`,
          `Interfaces: ${analysis.interfaces.length}`,
          `Types: ${analysis.types.length}`,
        ].join('\n')

        return {
          success: true,
          output: summary,
          metadata: analysis as unknown as Record<string, unknown>,
        }
      } catch (error) {
        return {
          success: false,
          output: '',
          error: error instanceof Error ? error.message : 'Failed to analyze file',
        }
      }
    },
  }

  const findDependencies: Tool = {
    name: 'findDependencies',
    description: 'Find all files that import a specific module or file',
    category: 'analysis',
    inputSchema: {
      type: 'object',
      properties: {
        module: {
          type: 'string',
          description: 'Module name or file path to search for',
        },
        filePattern: {
          type: 'string',
          description: 'Glob pattern to filter files',
          default: '**/*.{ts,tsx}',
        },
      },
      required: ['module'],
    },
    async execute(input: unknown): Promise<ToolResult> {
      const { module, filePattern = '**/*.{ts,tsx}' } = input as {
        module: string
        filePattern?: string
      }

      try {
        const files = await glob(filePattern, {
          cwd: workingDirectory,
          ignore: ['node_modules/**', 'dist/**'],
          nodir: true,
        })

        const dependents: Array<{ file: string; line: number; importStatement: string }> = []

        for (const file of files) {
          const fullPath = path.resolve(workingDirectory, file)
          const content = await fs.readFile(fullPath, 'utf-8')
          const lines = content.split('\n')

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i]
            if (line.includes('import') && line.includes(module)) {
              dependents.push({
                file,
                line: i + 1,
                importStatement: line.trim(),
              })
            }
          }
        }

        const output = dependents
          .map((d) => `${d.file}:${d.line}\n  ${d.importStatement}`)
          .join('\n\n')

        return {
          success: true,
          output: output || `No files import "${module}"`,
          metadata: { count: dependents.length, dependents },
        }
      } catch (error) {
        return {
          success: false,
          output: '',
          error: error instanceof Error ? error.message : 'Failed to find dependencies',
        }
      }
    },
  }

  const getExports: Tool = {
    name: 'getExports',
    description: 'Get all exports from a file',
    category: 'analysis',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the file',
        },
      },
      required: ['path'],
    },
    async execute(input: unknown): Promise<ToolResult> {
      const { path: filePath } = input as { path: string }

      try {
        const fullPath = resolvePath(filePath)
        const content = await fs.readFile(fullPath, 'utf-8')

        const exports: ExportInfo[] = []

        // Default export
        if (/export\s+default/.test(content)) {
          exports.push({ name: 'default', type: 'default', line: 0 })
        }

        // Named exports
        const namedExportRegex = /export\s+(?:async\s+)?(?:function|const|let|var|class|interface|type)\s+(\w+)/g
        let match: RegExpExecArray | null
        while ((match = namedExportRegex.exec(content)) !== null) {
          const lineNum = content.substring(0, match.index).split('\n').length
          exports.push({
            name: match[1],
            type: match[0].includes('function')
              ? 'function'
              : match[0].includes('class')
                ? 'class'
                : match[0].includes('interface')
                  ? 'interface'
                  : match[0].includes('type')
                    ? 'type'
                    : 'variable',
            line: lineNum,
          })
        }

        // Re-exports
        const reExportRegex = /export\s+\{([^}]+)\}\s+from/g
        while ((match = reExportRegex.exec(content)) !== null) {
          const names = match[1].split(',').map((s) => s.trim().split(' as ')[0])
          for (const name of names) {
            exports.push({ name, type: 'variable', line: 0 })
          }
        }

        const output = exports.map((e) => `${e.name} (${e.type})`).join('\n')

        return {
          success: true,
          output: output || 'No exports found',
          metadata: { exports },
        }
      } catch (error) {
        return {
          success: false,
          output: '',
          error: error instanceof Error ? error.message : 'Failed to get exports',
        }
      }
    },
  }

  const findDefinition: Tool = {
    name: 'findDefinition',
    description: 'Find where a symbol (function, class, variable) is defined',
    category: 'analysis',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Name of the symbol to find',
        },
        filePattern: {
          type: 'string',
          description: 'Glob pattern to filter files',
          default: '**/*.{ts,tsx}',
        },
      },
      required: ['symbol'],
    },
    async execute(input: unknown): Promise<ToolResult> {
      const { symbol, filePattern = '**/*.{ts,tsx}' } = input as {
        symbol: string
        filePattern?: string
      }

      try {
        const files = await glob(filePattern, {
          cwd: workingDirectory,
          ignore: ['node_modules/**', 'dist/**', '**/*.d.ts'],
          nodir: true,
        })

        const definitions: Array<{ file: string; line: number; type: string; context: string }> = []

        const patterns = [
          { regex: new RegExp(`^(?:export\\s+)?(?:async\\s+)?function\\s+${symbol}\\s*[(<]`, 'gm'), type: 'function' },
          { regex: new RegExp(`^(?:export\\s+)?(?:const|let|var)\\s+${symbol}\\s*[=:]`, 'gm'), type: 'variable' },
          { regex: new RegExp(`^(?:export\\s+)?(?:abstract\\s+)?class\\s+${symbol}\\s*[{<]`, 'gm'), type: 'class' },
          { regex: new RegExp(`^(?:export\\s+)?interface\\s+${symbol}\\s*[{<]`, 'gm'), type: 'interface' },
          { regex: new RegExp(`^(?:export\\s+)?type\\s+${symbol}\\s*[=<]`, 'gm'), type: 'type' },
        ]

        for (const file of files) {
          const fullPath = path.resolve(workingDirectory, file)
          const content = await fs.readFile(fullPath, 'utf-8')
          const lines = content.split('\n')

          for (const { regex, type } of patterns) {
            let match: RegExpExecArray | null
            while ((match = regex.exec(content)) !== null) {
              const lineNum = content.substring(0, match.index).split('\n').length
              definitions.push({
                file,
                line: lineNum,
                type,
                context: lines[lineNum - 1].trim().substring(0, 100),
              })
            }
          }
        }

        const output = definitions
          .map((d) => `${d.file}:${d.line} (${d.type})\n  ${d.context}`)
          .join('\n\n')

        return {
          success: true,
          output: output || `No definition found for "${symbol}"`,
          metadata: { count: definitions.length, definitions },
        }
      } catch (error) {
        return {
          success: false,
          output: '',
          error: error instanceof Error ? error.message : 'Failed to find definition',
        }
      }
    },
  }

  const analyzeComplexity: Tool = {
    name: 'analyzeComplexity',
    description: 'Analyze code complexity metrics for a file',
    category: 'analysis',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the file to analyze',
        },
      },
      required: ['path'],
    },
    async execute(input: unknown): Promise<ToolResult> {
      const { path: filePath } = input as { path: string }

      try {
        const fullPath = resolvePath(filePath)
        const content = await fs.readFile(fullPath, 'utf-8')
        const lines = content.split('\n')

        // Basic complexity metrics
        const metrics = {
          loc: lines.length,
          sloc: lines.filter((l) => l.trim() && !l.trim().startsWith('//')).length,
          comments: lines.filter((l) => l.trim().startsWith('//')).length,
          functions: (content.match(/function\s+\w+/g) || []).length,
          classes: (content.match(/class\s+\w+/g) || []).length,
          conditionals: (content.match(/\b(if|else|switch|case|\?)\b/g) || []).length,
          loops: (content.match(/\b(for|while|do)\b/g) || []).length,
          imports: (content.match(/^import\s+/gm) || []).length,
          exports: (content.match(/^export\s+/gm) || []).length,
        }

        // Estimate cyclomatic complexity
        const cyclomaticComplexity =
          1 +
          metrics.conditionals +
          metrics.loops +
          (content.match(/&&|\|\|/g) || []).length

        const output = [
          `File: ${filePath}`,
          `Lines of code: ${metrics.loc}`,
          `Source lines: ${metrics.sloc}`,
          `Comment lines: ${metrics.comments}`,
          `Functions: ${metrics.functions}`,
          `Classes: ${metrics.classes}`,
          `Conditionals: ${metrics.conditionals}`,
          `Loops: ${metrics.loops}`,
          `Imports: ${metrics.imports}`,
          `Exports: ${metrics.exports}`,
          `Estimated cyclomatic complexity: ${cyclomaticComplexity}`,
        ].join('\n')

        return {
          success: true,
          output,
          metadata: { ...metrics, cyclomaticComplexity },
        }
      } catch (error) {
        return {
          success: false,
          output: '',
          error: error instanceof Error ? error.message : 'Failed to analyze complexity',
        }
      }
    },
  }

  return [
    analyzeFile,
    findDependencies,
    getExports,
    findDefinition,
    analyzeComplexity,
  ]
}
