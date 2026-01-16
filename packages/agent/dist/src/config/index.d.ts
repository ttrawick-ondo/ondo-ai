import type { AgentConfig } from '../types/index.js';
import { validateConfig, validatePartialConfig } from './schema.js';
export interface LoadConfigOptions {
    configPath?: string;
    throwOnMissing?: boolean;
}
export declare function loadConfig(workingDirectory: string, options?: LoadConfigOptions): Promise<AgentConfig>;
export declare function validateConfigFile(filePath: string): Promise<{
    valid: boolean;
    errors?: string[];
    config?: AgentConfig;
}>;
export declare function writeConfig(workingDirectory: string, config: Partial<AgentConfig>, fileName?: string): Promise<void>;
export declare function initConfig(workingDirectory: string): Promise<AgentConfig>;
export { DEFAULT_CONFIG, createDefaultConfig } from './defaults.js';
export { mergeWithDefaults } from './schema.js';
export { validateConfig, validatePartialConfig };
//# sourceMappingURL=index.d.ts.map