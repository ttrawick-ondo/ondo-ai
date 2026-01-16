import type { Tool, ToolRegistry, ToolCategory } from '../types/index.js'

class DefaultToolRegistry implements ToolRegistry {
  private tools: Map<string, Tool> = new Map()

  register(tool: Tool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool "${tool.name}" is already registered`)
    }
    this.tools.set(tool.name, tool)
  }

  unregister(name: string): void {
    this.tools.delete(name)
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name)
  }

  getAll(): Tool[] {
    return Array.from(this.tools.values())
  }

  getByCategory(category: ToolCategory): Tool[] {
    return this.getAll().filter((tool) => tool.category === category)
  }

  has(name: string): boolean {
    return this.tools.has(name)
  }

  clear(): void {
    this.tools.clear()
  }

  size(): number {
    return this.tools.size
  }
}

// Singleton registry instance
let registryInstance: DefaultToolRegistry | null = null

export function getToolRegistry(): ToolRegistry {
  if (!registryInstance) {
    registryInstance = new DefaultToolRegistry()
  }
  return registryInstance
}

export function createToolRegistry(): ToolRegistry {
  return new DefaultToolRegistry()
}

// Import and re-export tool factories
import { createFileOpsTools } from './file-ops.js'
import { createTestRunnerTools } from './test-runner.js'
import { createLinterTools } from './linter.js'
import { createGitOpsTools } from './git-ops.js'
import { createCodeAnalysisTools } from './code-analysis.js'

export { createFileOpsTools, createTestRunnerTools, createLinterTools, createGitOpsTools, createCodeAnalysisTools }

// Register all tools at once
export function registerAllTools(registry: ToolRegistry, workingDirectory: string): void {
  const allTools = [
    ...createFileOpsTools(workingDirectory),
    ...createTestRunnerTools(workingDirectory),
    ...createLinterTools(workingDirectory),
    ...createGitOpsTools(workingDirectory),
    ...createCodeAnalysisTools(workingDirectory),
  ]

  for (const tool of allTools) {
    registry.register(tool)
  }
}
