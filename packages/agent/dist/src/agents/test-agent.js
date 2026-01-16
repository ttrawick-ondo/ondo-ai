import { AbstractAgent } from './base.js';
export class TestAgent extends AbstractAgent {
    metadata = {
        role: 'test',
        name: 'Test Agent',
        description: 'Generates and fixes tests for TypeScript/React code',
        autonomyLevel: 'full',
        capabilities: {
            canReadFiles: true,
            canWriteFiles: true,
            canExecuteCommands: true,
            canModifyTests: true,
            canModifySource: false,
            canCommit: false,
        },
    };
    async execute(context) {
        return this.runAgentLoop(context);
    }
    async planExecution(context) {
        const target = context.task.target;
        const steps = [];
        if (target?.files?.length) {
            // Analyze each target file
            for (const file of target.files) {
                steps.push({
                    id: `analyze-${file}`,
                    description: `Analyze ${file} to understand its structure and dependencies`,
                    toolName: 'analyzeFile',
                    dependsOn: [],
                    optional: false,
                });
                steps.push({
                    id: `check-test-${file}`,
                    description: `Check if test file exists for ${file}`,
                    toolName: 'checkTestFile',
                    dependsOn: [`analyze-${file}`],
                    optional: false,
                });
            }
            steps.push({
                id: 'generate-tests',
                description: 'Generate or update test files',
                toolName: 'writeFile',
                dependsOn: target.files.map((f) => `check-test-${f}`),
                optional: false,
            });
            steps.push({
                id: 'run-tests',
                description: 'Run tests to verify they pass',
                toolName: 'runTests',
                dependsOn: ['generate-tests'],
                optional: false,
            });
        }
        return {
            steps,
            estimatedToolCalls: steps.length * 2,
            requiresApproval: false,
            risks: ['May overwrite existing test files'],
        };
    }
    async validateResult(result) {
        const issues = [];
        if (!result.success) {
            issues.push({
                severity: 'error',
                message: result.error || 'Test generation failed',
            });
        }
        // Check if any test files were created
        const testFiles = result.changes.filter((c) => c.path.includes('.test.') || c.path.includes('.spec.'));
        if (testFiles.length === 0 && result.success) {
            issues.push({
                severity: 'warning',
                message: 'No test files were created or modified',
            });
        }
        return {
            valid: issues.filter((i) => i.severity === 'error').length === 0,
            issues,
            suggestions: testFiles.length === 0 ? ['Consider reviewing the target files'] : [],
        };
    }
    buildSystemPrompt(context) {
        return `You are a Test Agent specialized in generating comprehensive tests for TypeScript and React code.

Your responsibilities:
1. Analyze source files to understand their structure, exports, and dependencies
2. Generate test files with thorough test cases covering happy paths and edge cases
3. Use the project's testing framework (${context.config.testing.framework})
4. Follow the project's testing patterns and conventions
5. Ensure tests are isolated and do not depend on external state
6. Mock external dependencies appropriately
7. Run tests to verify they pass before completing

Testing guidelines:
- Use descriptive test names that explain the expected behavior
- Test each exported function, class, and component
- Include tests for error cases and edge conditions
- For React components, test rendering, user interactions, and state changes
- Use proper assertions and matchers
- Group related tests using describe blocks

Available tools:
${Array.from(context.tools.keys()).join(', ')}

Working directory: ${context.workingDirectory}
Max iterations: ${context.maxIterations}

When you have successfully generated and verified tests, provide a summary of:
- Test files created/modified
- Number of test cases added
- Coverage improvements (if available)
- Any issues encountered`;
    }
    buildInitialPrompt(context) {
        const target = context.task.target;
        const files = target?.files?.join(', ') || target?.pattern || 'all files';
        return `Generate comprehensive tests for the following target: ${files}

Task description: ${context.task.description}

Options:
- Coverage target: ${context.task.options.coverageTarget ?? context.config.testing.coverageThreshold?.lines ?? 80}%
- Test filter: ${context.task.options.testFilter || 'none'}
- Auto-fix: ${context.task.options.autoFix ?? true}

Please:
1. First, analyze the target files to understand their structure
2. Check if test files already exist
3. Generate or update test files with comprehensive test cases
4. Run the tests to verify they pass
5. If tests fail, fix them and re-run

Begin by analyzing the target files.`;
    }
}
//# sourceMappingURL=test-agent.js.map