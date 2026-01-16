import { AbstractAgent } from './base.js';
export class QAAgent extends AbstractAgent {
    metadata = {
        role: 'qa',
        name: 'QA Agent',
        description: 'Validates code quality through linting, type checking, and test execution',
        autonomyLevel: 'full',
        capabilities: {
            canReadFiles: true,
            canWriteFiles: false,
            canExecuteCommands: true,
            canModifyTests: false,
            canModifySource: false,
            canCommit: false,
        },
    };
    async execute(context) {
        return this.runAgentLoop(context);
    }
    async planExecution(_context) {
        return {
            steps: [
                {
                    id: 'type-check',
                    description: 'Run TypeScript type checking',
                    toolName: 'runTypeCheck',
                    dependsOn: [],
                    optional: false,
                },
                {
                    id: 'lint',
                    description: 'Run ESLint to check for code style issues',
                    toolName: 'runEslint',
                    dependsOn: [],
                    optional: false,
                },
                {
                    id: 'run-tests',
                    description: 'Execute test suite',
                    toolName: 'runTests',
                    dependsOn: [],
                    optional: false,
                },
                {
                    id: 'check-coverage',
                    description: 'Check test coverage',
                    toolName: 'getCoverage',
                    dependsOn: ['run-tests'],
                    optional: true,
                },
            ],
            estimatedToolCalls: 4,
            requiresApproval: false,
            risks: [],
        };
    }
    async validateResult(result) {
        const issues = [];
        // Check tool results for failures
        for (const toolUse of result.toolsUsed) {
            if (!toolUse.result.success) {
                const severity = toolUse.toolName.includes('test') ? 'error' : 'warning';
                issues.push({
                    severity: severity,
                    message: `${toolUse.toolName} failed: ${toolUse.result.error || 'Unknown error'}`,
                });
            }
        }
        return {
            valid: issues.filter((i) => i.severity === 'error').length === 0,
            issues,
            suggestions: issues.length > 0 ? ['Fix the reported issues before committing'] : [],
        };
    }
    buildSystemPrompt(context) {
        return `You are a QA Agent responsible for validating code quality and ensuring all checks pass.

Your responsibilities:
1. Run TypeScript type checking to catch type errors
2. Execute ESLint to identify code style and quality issues
3. Run the test suite to verify functionality
4. Check test coverage against thresholds
5. Report all issues found clearly and concisely

QA checks to perform:
- TypeScript compilation (no emit, just type checking)
- ESLint with the project's configuration
- Vitest test execution
- Coverage report generation

You should NOT modify any files. Your role is strictly to validate and report.

Available tools:
${Array.from(context.tools.keys()).join(', ')}

Working directory: ${context.workingDirectory}

Coverage thresholds:
- Lines: ${context.config.testing.coverageThreshold?.lines ?? 80}%
- Branches: ${context.config.testing.coverageThreshold?.branches ?? 70}%
- Functions: ${context.config.testing.coverageThreshold?.functions ?? 80}%

When complete, provide a summary including:
- Type check results (pass/fail, error count)
- Lint results (error count, warning count)
- Test results (passed, failed, skipped)
- Coverage percentages
- Overall QA status (PASS/FAIL)`;
    }
    buildInitialPrompt(context) {
        const preCommit = context.task.options.dryRun ? '' : ' (pre-commit mode)';
        return `Run QA validation checks${preCommit}.

Task: ${context.task.description}

Please execute the following checks in order:
1. TypeScript type checking
2. ESLint validation
3. Test suite execution
4. Coverage analysis

Report all findings and provide an overall QA status.

Begin with TypeScript type checking.`;
    }
}
//# sourceMappingURL=qa-agent.js.map