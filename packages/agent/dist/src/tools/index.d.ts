import type { ToolRegistry } from '../types/index.js';
export declare function getToolRegistry(): ToolRegistry;
export declare function createToolRegistry(): ToolRegistry;
import { createFileOpsTools } from './file-ops.js';
import { createTestRunnerTools } from './test-runner.js';
import { createLinterTools } from './linter.js';
import { createGitOpsTools } from './git-ops.js';
import { createCodeAnalysisTools } from './code-analysis.js';
export { createFileOpsTools, createTestRunnerTools, createLinterTools, createGitOpsTools, createCodeAnalysisTools };
export declare function registerAllTools(registry: ToolRegistry, workingDirectory: string): void;
//# sourceMappingURL=index.d.ts.map