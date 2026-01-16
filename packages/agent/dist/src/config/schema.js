import { AgentConfigSchema, } from '../types/config.js';
import { DEFAULT_CONFIG } from './defaults.js';
export function validateConfig(input) {
    try {
        const result = AgentConfigSchema.safeParse(input);
        if (result.success) {
            return {
                success: true,
                config: result.data,
            };
        }
        const errors = result.error.errors.map((err) => ({
            path: err.path.join('.'),
            message: err.message,
            code: err.code,
        }));
        return {
            success: false,
            errors,
        };
    }
    catch (error) {
        return {
            success: false,
            errors: [
                {
                    path: '',
                    message: error instanceof Error ? error.message : 'Unknown validation error',
                    code: 'unknown',
                },
            ],
        };
    }
}
export function mergeWithDefaults(partial) {
    const defaultCoverage = DEFAULT_CONFIG.testing.coverageThreshold;
    const partialCoverage = partial.testing?.coverageThreshold;
    return {
        project: {
            ...DEFAULT_CONFIG.project,
            ...partial.project,
        },
        defaults: {
            ...DEFAULT_CONFIG.defaults,
            ...partial.defaults,
        },
        autonomy: {
            ...DEFAULT_CONFIG.autonomy,
            ...partial.autonomy,
            taskTypes: {
                ...DEFAULT_CONFIG.autonomy.taskTypes,
                ...partial.autonomy?.taskTypes,
            },
        },
        testing: {
            ...DEFAULT_CONFIG.testing,
            ...partial.testing,
            coverageThreshold: {
                lines: partialCoverage?.lines ?? defaultCoverage.lines,
                branches: partialCoverage?.branches ?? defaultCoverage.branches,
                functions: partialCoverage?.functions ?? defaultCoverage.functions,
                statements: partialCoverage?.statements ?? defaultCoverage.statements,
            },
        },
    };
}
export function validatePartialConfig(input) {
    // Create a partial schema for validation
    const PartialConfigSchema = AgentConfigSchema.deepPartial();
    try {
        const result = PartialConfigSchema.safeParse(input);
        if (result.success) {
            const merged = mergeWithDefaults(result.data);
            return {
                success: true,
                config: merged,
            };
        }
        const errors = result.error.errors.map((err) => ({
            path: err.path.join('.'),
            message: err.message,
            code: err.code,
        }));
        return {
            success: false,
            errors,
        };
    }
    catch (error) {
        return {
            success: false,
            errors: [
                {
                    path: '',
                    message: error instanceof Error ? error.message : 'Unknown validation error',
                    code: 'unknown',
                },
            ],
        };
    }
}
// Helper to check if a model string is valid
export function isValidModel(model) {
    const validPrefixes = ['claude-', 'gpt-', 'o1-'];
    return validPrefixes.some((prefix) => model.startsWith(prefix));
}
// Sanitize config for logging (remove sensitive data)
export function sanitizeConfigForLogging(config) {
    return {
        project: {
            name: config.project.name,
            srcDir: config.project.srcDir,
            testsDir: config.project.testsDir,
        },
        defaults: {
            model: config.defaults.model,
            maxIterations: config.defaults.maxIterations,
        },
        autonomy: config.autonomy,
        testing: {
            framework: config.testing.framework,
            testPattern: config.testing.testPattern,
        },
    };
}
//# sourceMappingURL=schema.js.map