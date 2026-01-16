import { z } from 'zod'

export const AgentRoleSchema = z.enum(['test', 'qa', 'feature', 'refactor'])
export type AgentRole = z.infer<typeof AgentRoleSchema>

export const AutonomyLevelSchema = z.enum(['full', 'supervised', 'manual'])
export type AutonomyLevel = z.infer<typeof AutonomyLevelSchema>

export const CoverageThresholdSchema = z.object({
  lines: z.number().min(0).max(100).default(80),
  branches: z.number().min(0).max(100).default(70),
  functions: z.number().min(0).max(100).default(80),
  statements: z.number().min(0).max(100).optional(),
})
export type CoverageThreshold = z.infer<typeof CoverageThresholdSchema>

export const TestingConfigSchema = z.object({
  framework: z.enum(['vitest', 'jest']).default('vitest'),
  coverageThreshold: CoverageThresholdSchema.optional(),
  testPattern: z.string().default('**/*.test.ts'),
  setupFiles: z.array(z.string()).optional(),
})
export type TestingConfig = z.infer<typeof TestingConfigSchema>

export const AutonomyConfigSchema = z.object({
  taskTypes: z.record(AgentRoleSchema, AutonomyLevelSchema).default({
    test: 'full',
    qa: 'full',
    feature: 'supervised',
    refactor: 'supervised',
  }),
  maxAutoApprovals: z.number().min(1).default(10),
  requireApprovalForDestructive: z.boolean().default(true),
})
export type AutonomyConfig = z.infer<typeof AutonomyConfigSchema>

export const ProjectConfigSchema = z.object({
  name: z.string(),
  conventionDocs: z.array(z.string()).optional(),
  srcDir: z.string().default('src'),
  testsDir: z.string().default('tests'),
  excludePatterns: z.array(z.string()).optional(),
})
export type ProjectConfig = z.infer<typeof ProjectConfigSchema>

export const DefaultsConfigSchema = z.object({
  model: z.string().default('claude-sonnet-4-20250514'),
  maxIterations: z.number().min(1).max(100).default(10),
  temperature: z.number().min(0).max(2).default(0),
  maxTokens: z.number().min(1).default(8192),
  thinkingBudget: z.number().optional(),
})
export type DefaultsConfig = z.infer<typeof DefaultsConfigSchema>

export const AgentConfigSchema = z.object({
  project: ProjectConfigSchema,
  defaults: DefaultsConfigSchema.default({}),
  autonomy: AutonomyConfigSchema.default({}),
  testing: TestingConfigSchema.default({}),
})
export type AgentConfig = z.infer<typeof AgentConfigSchema>

export const DEFAULT_CONFIG: AgentConfig = {
  project: {
    name: 'ondo-ai',
    srcDir: 'src',
    testsDir: 'tests',
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
