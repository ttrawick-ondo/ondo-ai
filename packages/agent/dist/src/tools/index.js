class DefaultToolRegistry {
    tools = new Map();
    register(tool) {
        if (this.tools.has(tool.name)) {
            throw new Error(`Tool "${tool.name}" is already registered`);
        }
        this.tools.set(tool.name, tool);
    }
    unregister(name) {
        this.tools.delete(name);
    }
    get(name) {
        return this.tools.get(name);
    }
    getAll() {
        return Array.from(this.tools.values());
    }
    getByCategory(category) {
        return this.getAll().filter((tool) => tool.category === category);
    }
    has(name) {
        return this.tools.has(name);
    }
    clear() {
        this.tools.clear();
    }
    size() {
        return this.tools.size;
    }
}
// Singleton registry instance
let registryInstance = null;
export function getToolRegistry() {
    if (!registryInstance) {
        registryInstance = new DefaultToolRegistry();
    }
    return registryInstance;
}
export function createToolRegistry() {
    return new DefaultToolRegistry();
}
// Import and re-export tool factories
import { createFileOpsTools } from './file-ops.js';
import { createTestRunnerTools } from './test-runner.js';
import { createLinterTools } from './linter.js';
import { createGitOpsTools } from './git-ops.js';
import { createCodeAnalysisTools } from './code-analysis.js';
export { createFileOpsTools, createTestRunnerTools, createLinterTools, createGitOpsTools, createCodeAnalysisTools };
// Register all tools at once
export function registerAllTools(registry, workingDirectory) {
    const allTools = [
        ...createFileOpsTools(workingDirectory),
        ...createTestRunnerTools(workingDirectory),
        ...createLinterTools(workingDirectory),
        ...createGitOpsTools(workingDirectory),
        ...createCodeAnalysisTools(workingDirectory),
    ];
    for (const tool of allTools) {
        registry.register(tool);
    }
}
//# sourceMappingURL=index.js.map