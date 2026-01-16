import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import type { AgentConfig } from '../types/index.js'
import { DEFAULT_CONFIG } from './defaults.js'
import { validateConfig, validatePartialConfig } from './schema.js'

const CONFIG_FILE_NAMES = ['.ondo-agent.json', 'ondo-agent.config.json', '.ondorc.json']

export interface LoadConfigOptions {
  configPath?: string
  throwOnMissing?: boolean
}

export async function loadConfig(
  workingDirectory: string,
  options: LoadConfigOptions = {}
): Promise<AgentConfig> {
  const { configPath, throwOnMissing = false } = options

  // If specific path provided, use it
  if (configPath) {
    return loadConfigFromPath(path.resolve(workingDirectory, configPath))
  }

  // Search for config file
  for (const fileName of CONFIG_FILE_NAMES) {
    const filePath = path.resolve(workingDirectory, fileName)
    try {
      await fs.access(filePath)
      return loadConfigFromPath(filePath)
    } catch {
      // File doesn't exist, try next
    }
  }

  // No config file found
  if (throwOnMissing) {
    throw new Error(
      `No configuration file found. Create one of: ${CONFIG_FILE_NAMES.join(', ')}`
    )
  }

  // Return default config with project name from package.json
  const projectName = await getProjectName(workingDirectory)
  return {
    ...DEFAULT_CONFIG,
    project: {
      ...DEFAULT_CONFIG.project,
      name: projectName,
    },
  }
}

async function loadConfigFromPath(filePath: string): Promise<AgentConfig> {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    const parsed = JSON.parse(content)

    // Validate and merge with defaults
    const result = validatePartialConfig(parsed)

    if (!result.success) {
      const errors = result.errors?.map((e) => `  ${e.path}: ${e.message}`).join('\n')
      throw new Error(`Invalid configuration in ${filePath}:\n${errors}`)
    }

    return result.config!
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in ${filePath}: ${error.message}`)
    }
    throw error
  }
}

async function getProjectName(workingDirectory: string): Promise<string> {
  try {
    const packageJsonPath = path.resolve(workingDirectory, 'package.json')
    const content = await fs.readFile(packageJsonPath, 'utf-8')
    const packageJson = JSON.parse(content)
    return packageJson.name || path.basename(workingDirectory)
  } catch {
    return path.basename(workingDirectory)
  }
}

export async function validateConfigFile(filePath: string): Promise<{
  valid: boolean
  errors?: string[]
  config?: AgentConfig
}> {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    const parsed = JSON.parse(content)
    const result = validateConfig(parsed)

    if (result.success) {
      return { valid: true, config: result.config }
    }

    return {
      valid: false,
      errors: result.errors?.map((e) => `${e.path}: ${e.message}`),
    }
  } catch (error) {
    if (error instanceof SyntaxError) {
      return { valid: false, errors: [`Invalid JSON: ${error.message}`] }
    }
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    }
  }
}

export async function writeConfig(
  workingDirectory: string,
  config: Partial<AgentConfig>,
  fileName = '.ondo-agent.json'
): Promise<void> {
  const filePath = path.resolve(workingDirectory, fileName)
  const content = JSON.stringify(config, null, 2) + '\n'
  await fs.writeFile(filePath, content, 'utf-8')
}

export async function initConfig(workingDirectory: string): Promise<AgentConfig> {
  const projectName = await getProjectName(workingDirectory)

  const config: AgentConfig = {
    project: {
      name: projectName,
      srcDir: 'src',
      testsDir: 'tests',
      conventionDocs: [],
      excludePatterns: [
        'node_modules/**',
        'dist/**',
        'build/**',
        '.next/**',
        'coverage/**',
      ],
    },
    defaults: {
      model: 'claude-sonnet-4-20250514',
      maxIterations: 10,
      temperature: 0,
      maxTokens: 8192,
    },
    autonomy: {
      taskTypes: {
        test: 'full',
        qa: 'full',
        feature: 'supervised',
        refactor: 'supervised',
      },
      maxAutoApprovals: 10,
      requireApprovalForDestructive: true,
    },
    testing: {
      framework: 'vitest',
      coverageThreshold: {
        lines: 80,
        branches: 70,
        functions: 80,
      },
      testPattern: '**/*.test.ts',
    },
  }

  await writeConfig(workingDirectory, config)
  return config
}

// Re-exports
export { DEFAULT_CONFIG, createDefaultConfig } from './defaults.js'
export { mergeWithDefaults } from './schema.js'
// validateConfig and validatePartialConfig are imported and used above, so export them directly
export { validateConfig, validatePartialConfig }
