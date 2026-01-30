import { AbstractAgent } from './base.js';
export class FeatureAgent extends AbstractAgent {
    metadata = {
        role: 'feature',
        name: 'Feature Agent',
        description: 'Implements new features based on specifications',
        autonomyLevel: 'supervised',
        capabilities: {
            canReadFiles: true,
            canWriteFiles: true,
            canExecuteCommands: true,
            canModifyTests: true,
            canModifySource: true,
            canCommit: true,
        },
    };
    async execute(context) {
        return this.runAgentLoop(context);
    }
    async planExecution(_context) {
        const steps = [
            {
                id: 'understand-codebase',
                description: 'Analyze relevant parts of the codebase',
                toolName: 'searchFiles',
                dependsOn: [],
                optional: false,
            },
            {
                id: 'identify-patterns',
                description: 'Identify existing patterns and conventions',
                toolName: 'analyzeFile',
                dependsOn: ['understand-codebase'],
                optional: false,
            },
            {
                id: 'implement-feature',
                description: 'Implement the feature following existing patterns',
                toolName: 'writeFile',
                dependsOn: ['identify-patterns'],
                optional: false,
            },
            {
                id: 'add-tests',
                description: 'Add tests for the new feature',
                toolName: 'writeFile',
                dependsOn: ['implement-feature'],
                optional: false,
            },
            {
                id: 'run-tests',
                description: 'Verify tests pass',
                toolName: 'runTests',
                dependsOn: ['add-tests'],
                optional: false,
            },
            {
                id: 'type-check',
                description: 'Verify no type errors',
                toolName: 'runTypeCheck',
                dependsOn: ['implement-feature'],
                optional: false,
            },
        ];
        return {
            steps,
            estimatedToolCalls: steps.length * 3,
            requiresApproval: true,
            risks: [
                'May modify existing files',
                'Feature implementation may affect other components',
                'Tests may need adjustment after review',
            ],
        };
    }
    async validateResult(result) {
        const issues = [];
        if (!result.success) {
            issues.push({
                severity: 'error',
                message: result.error || 'Feature implementation failed',
            });
        }
        // Check if source files were created/modified
        const sourceFiles = result.changes.filter((c) => !c.path.includes('.test.') && !c.path.includes('.spec.'));
        if (sourceFiles.length === 0 && result.success) {
            issues.push({
                severity: 'warning',
                message: 'No source files were created or modified',
            });
        }
        // Check if tests were added
        const testFiles = result.changes.filter((c) => c.path.includes('.test.') || c.path.includes('.spec.'));
        if (testFiles.length === 0) {
            issues.push({
                severity: 'warning',
                message: 'No test files were created for the new feature',
            });
        }
        return {
            valid: issues.filter((i) => i.severity === 'error').length === 0,
            issues,
            suggestions: testFiles.length === 0
                ? ['Consider adding tests for the new feature']
                : [],
        };
    }
    buildSystemPrompt(context) {
        return `You are a Feature Agent responsible for implementing new features in a TypeScript/React codebase.

Your responsibilities:
1. Understand the feature requirements from the specification
2. Analyze the existing codebase to understand patterns and conventions
3. Implement the feature following the project's coding standards
4. Write comprehensive tests for the new functionality
5. Ensure type safety and no lint errors
6. Document any significant design decisions

Implementation guidelines:
- Follow existing code patterns and conventions in the project
- Use TypeScript with strict typing
- Create small, focused functions and components
- Add proper error handling
- Write descriptive comments only where necessary
- Ensure backward compatibility unless explicitly changing behavior

Project structure:
- Source code: ${context.config.project.srcDir}/
- Tests: ${context.config.testing.testPattern}

Available tools:
${Array.from(context.tools.keys()).join(', ')}

Working directory: ${context.workingDirectory}
Max iterations: ${context.maxIterations}

IMPORTANT: This agent requires human approval for significant changes. Explain your approach before making changes.

When complete, provide:
- Summary of implemented feature
- Files created/modified
- Design decisions made
- Tests added
- Any follow-up tasks needed`;
    }
    buildInitialPrompt(context) {
        const spec = context.task.options.featureSpec || context.task.description;
        return `Implement the following feature:

${spec}

Task details:
- Title: ${context.task.title}
- Description: ${context.task.description}
- Target files: ${context.task.target?.files?.join(', ') || 'to be determined'}

Please:
1. First, analyze the codebase to understand existing patterns
2. Plan your implementation approach
3. Implement the feature incrementally
4. Add tests for each piece of functionality
5. Verify type safety and lint compliance

Begin by searching the codebase to understand the relevant components and patterns.`;
    }
}
//# sourceMappingURL=feature-agent.js.map