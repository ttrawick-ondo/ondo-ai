import { z } from 'zod';
export declare const AgentRoleSchema: z.ZodEnum<["test", "qa", "feature", "refactor", "docs", "security"]>;
export type AgentRole = z.infer<typeof AgentRoleSchema>;
export declare const AutonomyLevelSchema: z.ZodEnum<["full", "supervised", "manual"]>;
export type AutonomyLevel = z.infer<typeof AutonomyLevelSchema>;
export declare const CoverageThresholdSchema: z.ZodObject<{
    lines: z.ZodDefault<z.ZodNumber>;
    branches: z.ZodDefault<z.ZodNumber>;
    functions: z.ZodDefault<z.ZodNumber>;
    statements: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    lines: number;
    branches: number;
    functions: number;
    statements?: number | undefined;
}, {
    lines?: number | undefined;
    branches?: number | undefined;
    functions?: number | undefined;
    statements?: number | undefined;
}>;
export type CoverageThreshold = z.infer<typeof CoverageThresholdSchema>;
export declare const TestingConfigSchema: z.ZodObject<{
    framework: z.ZodDefault<z.ZodEnum<["vitest", "jest"]>>;
    coverageThreshold: z.ZodOptional<z.ZodObject<{
        lines: z.ZodDefault<z.ZodNumber>;
        branches: z.ZodDefault<z.ZodNumber>;
        functions: z.ZodDefault<z.ZodNumber>;
        statements: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        lines: number;
        branches: number;
        functions: number;
        statements?: number | undefined;
    }, {
        lines?: number | undefined;
        branches?: number | undefined;
        functions?: number | undefined;
        statements?: number | undefined;
    }>>;
    testPattern: z.ZodDefault<z.ZodString>;
    setupFiles: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    framework: "vitest" | "jest";
    testPattern: string;
    coverageThreshold?: {
        lines: number;
        branches: number;
        functions: number;
        statements?: number | undefined;
    } | undefined;
    setupFiles?: string[] | undefined;
}, {
    framework?: "vitest" | "jest" | undefined;
    coverageThreshold?: {
        lines?: number | undefined;
        branches?: number | undefined;
        functions?: number | undefined;
        statements?: number | undefined;
    } | undefined;
    testPattern?: string | undefined;
    setupFiles?: string[] | undefined;
}>;
export type TestingConfig = z.infer<typeof TestingConfigSchema>;
export declare const AutonomyConfigSchema: z.ZodObject<{
    taskTypes: z.ZodDefault<z.ZodRecord<z.ZodEnum<["test", "qa", "feature", "refactor", "docs", "security"]>, z.ZodEnum<["full", "supervised", "manual"]>>>;
    maxAutoApprovals: z.ZodDefault<z.ZodNumber>;
    requireApprovalForDestructive: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    taskTypes: Partial<Record<"test" | "qa" | "feature" | "refactor" | "docs" | "security", "full" | "supervised" | "manual">>;
    maxAutoApprovals: number;
    requireApprovalForDestructive: boolean;
}, {
    taskTypes?: Partial<Record<"test" | "qa" | "feature" | "refactor" | "docs" | "security", "full" | "supervised" | "manual">> | undefined;
    maxAutoApprovals?: number | undefined;
    requireApprovalForDestructive?: boolean | undefined;
}>;
export type AutonomyConfig = z.infer<typeof AutonomyConfigSchema>;
export declare const ProjectConfigSchema: z.ZodObject<{
    name: z.ZodString;
    conventionDocs: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    srcDir: z.ZodDefault<z.ZodString>;
    testsDir: z.ZodDefault<z.ZodString>;
    excludePatterns: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    name: string;
    srcDir: string;
    testsDir: string;
    conventionDocs?: string[] | undefined;
    excludePatterns?: string[] | undefined;
}, {
    name: string;
    conventionDocs?: string[] | undefined;
    srcDir?: string | undefined;
    testsDir?: string | undefined;
    excludePatterns?: string[] | undefined;
}>;
export type ProjectConfig = z.infer<typeof ProjectConfigSchema>;
export declare const DefaultsConfigSchema: z.ZodObject<{
    model: z.ZodDefault<z.ZodString>;
    maxIterations: z.ZodDefault<z.ZodNumber>;
    temperature: z.ZodDefault<z.ZodNumber>;
    maxTokens: z.ZodDefault<z.ZodNumber>;
    thinkingBudget: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    model: string;
    maxIterations: number;
    temperature: number;
    maxTokens: number;
    thinkingBudget?: number | undefined;
}, {
    model?: string | undefined;
    maxIterations?: number | undefined;
    temperature?: number | undefined;
    maxTokens?: number | undefined;
    thinkingBudget?: number | undefined;
}>;
export type DefaultsConfig = z.infer<typeof DefaultsConfigSchema>;
export declare const AgentConfigSchema: z.ZodObject<{
    project: z.ZodObject<{
        name: z.ZodString;
        conventionDocs: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        srcDir: z.ZodDefault<z.ZodString>;
        testsDir: z.ZodDefault<z.ZodString>;
        excludePatterns: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        srcDir: string;
        testsDir: string;
        conventionDocs?: string[] | undefined;
        excludePatterns?: string[] | undefined;
    }, {
        name: string;
        conventionDocs?: string[] | undefined;
        srcDir?: string | undefined;
        testsDir?: string | undefined;
        excludePatterns?: string[] | undefined;
    }>;
    defaults: z.ZodDefault<z.ZodObject<{
        model: z.ZodDefault<z.ZodString>;
        maxIterations: z.ZodDefault<z.ZodNumber>;
        temperature: z.ZodDefault<z.ZodNumber>;
        maxTokens: z.ZodDefault<z.ZodNumber>;
        thinkingBudget: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        model: string;
        maxIterations: number;
        temperature: number;
        maxTokens: number;
        thinkingBudget?: number | undefined;
    }, {
        model?: string | undefined;
        maxIterations?: number | undefined;
        temperature?: number | undefined;
        maxTokens?: number | undefined;
        thinkingBudget?: number | undefined;
    }>>;
    autonomy: z.ZodDefault<z.ZodObject<{
        taskTypes: z.ZodDefault<z.ZodRecord<z.ZodEnum<["test", "qa", "feature", "refactor", "docs", "security"]>, z.ZodEnum<["full", "supervised", "manual"]>>>;
        maxAutoApprovals: z.ZodDefault<z.ZodNumber>;
        requireApprovalForDestructive: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        taskTypes: Partial<Record<"test" | "qa" | "feature" | "refactor" | "docs" | "security", "full" | "supervised" | "manual">>;
        maxAutoApprovals: number;
        requireApprovalForDestructive: boolean;
    }, {
        taskTypes?: Partial<Record<"test" | "qa" | "feature" | "refactor" | "docs" | "security", "full" | "supervised" | "manual">> | undefined;
        maxAutoApprovals?: number | undefined;
        requireApprovalForDestructive?: boolean | undefined;
    }>>;
    testing: z.ZodDefault<z.ZodObject<{
        framework: z.ZodDefault<z.ZodEnum<["vitest", "jest"]>>;
        coverageThreshold: z.ZodOptional<z.ZodObject<{
            lines: z.ZodDefault<z.ZodNumber>;
            branches: z.ZodDefault<z.ZodNumber>;
            functions: z.ZodDefault<z.ZodNumber>;
            statements: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            lines: number;
            branches: number;
            functions: number;
            statements?: number | undefined;
        }, {
            lines?: number | undefined;
            branches?: number | undefined;
            functions?: number | undefined;
            statements?: number | undefined;
        }>>;
        testPattern: z.ZodDefault<z.ZodString>;
        setupFiles: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        framework: "vitest" | "jest";
        testPattern: string;
        coverageThreshold?: {
            lines: number;
            branches: number;
            functions: number;
            statements?: number | undefined;
        } | undefined;
        setupFiles?: string[] | undefined;
    }, {
        framework?: "vitest" | "jest" | undefined;
        coverageThreshold?: {
            lines?: number | undefined;
            branches?: number | undefined;
            functions?: number | undefined;
            statements?: number | undefined;
        } | undefined;
        testPattern?: string | undefined;
        setupFiles?: string[] | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    project: {
        name: string;
        srcDir: string;
        testsDir: string;
        conventionDocs?: string[] | undefined;
        excludePatterns?: string[] | undefined;
    };
    defaults: {
        model: string;
        maxIterations: number;
        temperature: number;
        maxTokens: number;
        thinkingBudget?: number | undefined;
    };
    autonomy: {
        taskTypes: Partial<Record<"test" | "qa" | "feature" | "refactor" | "docs" | "security", "full" | "supervised" | "manual">>;
        maxAutoApprovals: number;
        requireApprovalForDestructive: boolean;
    };
    testing: {
        framework: "vitest" | "jest";
        testPattern: string;
        coverageThreshold?: {
            lines: number;
            branches: number;
            functions: number;
            statements?: number | undefined;
        } | undefined;
        setupFiles?: string[] | undefined;
    };
}, {
    project: {
        name: string;
        conventionDocs?: string[] | undefined;
        srcDir?: string | undefined;
        testsDir?: string | undefined;
        excludePatterns?: string[] | undefined;
    };
    defaults?: {
        model?: string | undefined;
        maxIterations?: number | undefined;
        temperature?: number | undefined;
        maxTokens?: number | undefined;
        thinkingBudget?: number | undefined;
    } | undefined;
    autonomy?: {
        taskTypes?: Partial<Record<"test" | "qa" | "feature" | "refactor" | "docs" | "security", "full" | "supervised" | "manual">> | undefined;
        maxAutoApprovals?: number | undefined;
        requireApprovalForDestructive?: boolean | undefined;
    } | undefined;
    testing?: {
        framework?: "vitest" | "jest" | undefined;
        coverageThreshold?: {
            lines?: number | undefined;
            branches?: number | undefined;
            functions?: number | undefined;
            statements?: number | undefined;
        } | undefined;
        testPattern?: string | undefined;
        setupFiles?: string[] | undefined;
    } | undefined;
}>;
export type AgentConfig = z.infer<typeof AgentConfigSchema>;
export declare const DEFAULT_CONFIG: AgentConfig;
//# sourceMappingURL=config.d.ts.map