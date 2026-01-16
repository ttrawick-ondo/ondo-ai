import type { AgentConfig, AutonomyLevel, AgentRole } from '../types/index.js';
export declare const DEFAULT_MODEL = "claude-sonnet-4-20250514";
export declare const DEFAULT_MAX_ITERATIONS = 10;
export declare const DEFAULT_TEMPERATURE = 0;
export declare const DEFAULT_MAX_TOKENS = 8192;
export declare const DEFAULT_COVERAGE_THRESHOLDS: {
    readonly lines: 80;
    readonly branches: 70;
    readonly functions: 80;
};
export declare const DEFAULT_AUTONOMY_LEVELS: Record<AgentRole, AutonomyLevel>;
export declare const DEFAULT_TEST_PATTERNS: string[];
export declare const DEFAULT_EXCLUDE_PATTERNS: string[];
export declare const DEFAULT_CONFIG: AgentConfig;
export declare function createDefaultConfig(projectName: string): AgentConfig;
//# sourceMappingURL=defaults.d.ts.map