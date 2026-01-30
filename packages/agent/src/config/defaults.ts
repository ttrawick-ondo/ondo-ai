import type { AgentConfig, AutonomyLevel, AgentRole } from '../types/index.js'

export const DEFAULT_MODEL = 'claude-sonnet-4-20250514'
export const DEFAULT_MAX_ITERATIONS = 10
export const DEFAULT_TEMPERATURE = 0
export const DEFAULT_MAX_TOKENS = 8192

export const DEFAULT_COVERAGE_THRESHOLDS = {
  lines: 80,
  branches: 70,
  functions: 80,
} as const

export const DEFAULT_AUTONOMY_LEVELS: Record<AgentRole, AutonomyLevel> = {
  test: 'full',
  qa: 'full',
  feature: 'supervised',
  refactor: 'supervised',
  docs: 'supervised',
  security: 'supervised',
}

export const DEFAULT_TEST_PATTERNS = [
  '**/*.test.ts',
  '**/*.test.tsx',
  '**/*.spec.ts',
  '**/*.spec.tsx',
]

export const DEFAULT_EXCLUDE_PATTERNS = [
  'node_modules/**',
  'dist/**',
  'build/**',
  '.next/**',
  'coverage/**',
  '*.d.ts',
]

export const DEFAULT_CONFIG: AgentConfig = {
  project: {
    name: 'ondo-ai',
    srcDir: 'src',
    testsDir: 'tests',
    excludePatterns: DEFAULT_EXCLUDE_PATTERNS,
  },
  defaults: {
    model: DEFAULT_MODEL,
    maxIterations: DEFAULT_MAX_ITERATIONS,
    temperature: DEFAULT_TEMPERATURE,
    maxTokens: DEFAULT_MAX_TOKENS,
  },
  autonomy: {
    taskTypes: DEFAULT_AUTONOMY_LEVELS,
    maxAutoApprovals: 10,
    requireApprovalForDestructive: true,
  },
  testing: {
    framework: 'vitest',
    coverageThreshold: DEFAULT_COVERAGE_THRESHOLDS,
    testPattern: '**/*.test.ts',
  },
}

export function createDefaultConfig(projectName: string): AgentConfig {
  return {
    ...DEFAULT_CONFIG,
    project: {
      ...DEFAULT_CONFIG.project,
      name: projectName,
    },
  }
}
