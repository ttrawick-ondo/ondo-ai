import { type AgentConfig } from '../types/config.js';
export interface ConfigValidationResult {
    success: boolean;
    config?: AgentConfig;
    errors?: ConfigValidationError[];
}
export interface ConfigValidationError {
    path: string;
    message: string;
    code: string;
}
export declare function validateConfig(input: unknown): ConfigValidationResult;
export declare function mergeWithDefaults(partial: Partial<AgentConfig>): AgentConfig;
export declare function validatePartialConfig(input: unknown): ConfigValidationResult;
export declare function isValidModel(model: string): boolean;
export declare function sanitizeConfigForLogging(config: AgentConfig): Record<string, unknown>;
//# sourceMappingURL=schema.d.ts.map