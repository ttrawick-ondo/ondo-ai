import { AbstractAgent } from './base.js';
export class RefactorAgent extends AbstractAgent {
    metadata = {
        role: 'refactor',
        name: 'Refactor Agent',
        description: 'Improves code quality through refactoring while preserving behavior',
        autonomyLevel: 'supervised',
        capabilities: {
            canReadFiles: true,
            canWriteFiles: true,
            canExecuteCommands: true,
            canModifyTests: true,
            canModifySource: true,
            canCommit: false,
        },
    };
    async execute(context) {
        return this.runAgentLoop(context);
    }
    async planExecution(context) {
        const target = context.task.target;
        const refactorType = context.task.options.refactorType || 'simplify';
        const steps = [
            {
                id: 'analyze-current',
                description: 'Analyze current code structure and complexity',
                toolName: 'analyzeComplexity',
                dependsOn: [],
                optional: false,
            },
            {
                id: 'identify-issues',
                description: 'Identify code smells and improvement opportunities',
                toolName: 'analyzeFile',
                dependsOn: ['analyze-current'],
                optional: false,
            },
            {
                id: 'find-dependencies',
                description: 'Find all files that depend on the target code',
                toolName: 'findDependencies',
                dependsOn: ['analyze-current'],
                optional: false,
            },
            {
                id: 'run-tests-before',
                description: 'Run tests to establish baseline',
                toolName: 'runTests',
                dependsOn: [],
                optional: false,
            },
            {
                id: 'perform-refactor',
                description: `Perform ${refactorType} refactoring`,
                toolName: 'editFile',
                dependsOn: ['identify-issues', 'find-dependencies', 'run-tests-before'],
                optional: false,
            },
            {
                id: 'update-dependents',
                description: 'Update dependent files if needed',
                toolName: 'editFile',
                dependsOn: ['perform-refactor'],
                optional: true,
            },
            {
                id: 'run-tests-after',
                description: 'Verify tests still pass after refactoring',
                toolName: 'runTests',
                dependsOn: ['perform-refactor', 'update-dependents'],
                optional: false,
            },
            {
                id: 'type-check',
                description: 'Verify no type errors introduced',
                toolName: 'runTypeCheck',
                dependsOn: ['perform-refactor'],
                optional: false,
            },
        ];
        return {
            steps,
            estimatedToolCalls: steps.length * 2,
            requiresApproval: true,
            risks: [
                'Refactoring may break dependent code',
                'Behavior may change unintentionally',
                'Tests may need updates',
                `Affects ${target?.files?.length || 'unknown'} file(s)`,
            ],
        };
    }
    async validateResult(result) {
        const issues = [];
        if (!result.success) {
            issues.push({
                severity: 'error',
                message: result.error || 'Refactoring failed',
            });
        }
        // Check that tests were run
        const testRuns = result.toolsUsed.filter((t) => t.toolName === 'runTests');
        if (testRuns.length < 2) {
            issues.push({
                severity: 'warning',
                message: 'Tests should be run before and after refactoring',
            });
        }
        // Check if any test run failed
        const failedTests = testRuns.filter((t) => !t.result.success);
        if (failedTests.length > 0) {
            issues.push({
                severity: 'error',
                message: 'Tests failed after refactoring - behavior may have changed',
            });
        }
        // Check for type errors
        const typeChecks = result.toolsUsed.filter((t) => t.toolName === 'runTypeCheck');
        const failedTypeChecks = typeChecks.filter((t) => !t.result.success);
        if (failedTypeChecks.length > 0) {
            issues.push({
                severity: 'error',
                message: 'Type errors introduced during refactoring',
            });
        }
        return {
            valid: issues.filter((i) => i.severity === 'error').length === 0,
            issues,
            suggestions: failedTests.length > 0
                ? ['Review the changes and fix test failures', 'Consider reverting if behavior changed']
                : [],
        };
    }
    buildSystemPrompt(context) {
        const refactorType = context.task.options.refactorType || 'general';
        return `You are a Refactor Agent specialized in improving code quality while preserving existing behavior.

Your responsibilities:
1. Analyze code for complexity and improvement opportunities
2. Identify code smells and anti-patterns
3. Perform safe refactoring that preserves behavior
4. Update all dependent code as needed
5. Verify tests pass before and after changes
6. Ensure no type errors are introduced

Refactoring type: ${refactorType}

Refactoring guidelines:
- ALWAYS run tests before making changes to establish a baseline
- Make small, incremental changes
- Verify each change with tests
- Keep the same public API unless explicitly changing it
- Update imports and references in dependent files
- Add or update tests if refactoring exposes new edge cases

Common refactoring patterns:
- extract-function: Extract repeated or complex code into reusable functions
- extract-component: Extract UI elements into separate React components
- rename: Rename variables, functions, or files for clarity
- move: Move code to more appropriate locations
- simplify: Reduce complexity and improve readability
- optimize: Improve performance
- modernize: Update to modern patterns and APIs

Available tools:
${Array.from(context.tools.keys()).join(', ')}

Working directory: ${context.workingDirectory}
Max iterations: ${context.maxIterations}

IMPORTANT: This agent requires human approval. Explain your refactoring plan before making changes.

When complete, provide:
- Summary of refactoring performed
- Files modified
- Complexity metrics before/after
- Test results
- Any breaking changes (should be none)`;
    }
    buildInitialPrompt(context) {
        const target = context.task.target;
        const files = target?.files?.join(', ') || target?.directories?.join(', ') || target?.pattern || 'specified scope';
        const refactorType = context.task.options.refactorType || 'general improvement';
        return `Refactor the following code: ${files}

Refactoring type: ${refactorType}
Task: ${context.task.description}

Please:
1. First, run all tests to establish a baseline
2. Analyze the target code for complexity and issues
3. Identify all files that depend on the target code
4. Plan your refactoring approach (explain before doing)
5. Perform incremental refactoring
6. Update dependent files as needed
7. Verify tests still pass after each change
8. Confirm no type errors

Begin by running the existing tests to establish a baseline.`;
    }
}
//# sourceMappingURL=refactor-agent.js.map