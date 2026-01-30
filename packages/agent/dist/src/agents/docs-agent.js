import { AbstractAgent } from './base.js';
export class DocsAgent extends AbstractAgent {
    metadata = {
        role: 'docs',
        name: 'Documentation Agent',
        description: 'Generates and maintains documentation including README, API docs, and changelogs',
        autonomyLevel: 'supervised',
        capabilities: {
            canReadFiles: true,
            canWriteFiles: true,
            canExecuteCommands: true,
            canModifyTests: false,
            canModifySource: false,
            canCommit: true,
        },
    };
    async execute(context) {
        return this.runAgentLoop(context);
    }
    async planExecution(context) {
        const docType = context.task.options.docType || 'readme';
        const steps = [];
        // Step 1: Analyze the codebase structure
        steps.push({
            id: 'analyze-structure',
            description: 'Analyze project structure and key files',
            toolName: 'listFiles',
            dependsOn: [],
            optional: false,
        });
        // Step 2: Read existing documentation
        steps.push({
            id: 'read-existing-docs',
            description: 'Read existing documentation files',
            toolName: 'readFile',
            dependsOn: ['analyze-structure'],
            optional: true,
        });
        // Step 3: Analyze source code based on doc type
        if (docType === 'api' || docType === 'all') {
            steps.push({
                id: 'analyze-exports',
                description: 'Analyze exported functions, classes, and types',
                toolName: 'getExports',
                dependsOn: ['analyze-structure'],
                optional: false,
            });
        }
        if (docType === 'changelog' || docType === 'all') {
            steps.push({
                id: 'analyze-git-history',
                description: 'Analyze git commit history for changelog',
                toolName: 'gitLog',
                dependsOn: ['analyze-structure'],
                optional: false,
            });
        }
        // Step 4: Generate documentation
        steps.push({
            id: 'generate-docs',
            description: `Generate ${docType} documentation`,
            toolName: 'writeFile',
            dependsOn: docType === 'api'
                ? ['analyze-exports', 'read-existing-docs']
                : docType === 'changelog'
                    ? ['analyze-git-history', 'read-existing-docs']
                    : ['analyze-structure', 'read-existing-docs'],
            optional: false,
        });
        return {
            steps,
            estimatedToolCalls: steps.length * 3,
            requiresApproval: true,
            risks: [
                'May overwrite existing documentation files',
                'Generated docs may need manual review for accuracy',
            ],
        };
    }
    async validateResult(result) {
        const issues = [];
        if (!result.success) {
            issues.push({
                severity: 'error',
                message: result.error || 'Documentation generation failed',
            });
        }
        // Check if any documentation files were created or modified
        const docFiles = result.changes.filter((c) => c.path.endsWith('.md') ||
            c.path.includes('docs/') ||
            c.path.includes('CHANGELOG') ||
            c.path.includes('README'));
        if (docFiles.length === 0 && result.success) {
            issues.push({
                severity: 'warning',
                message: 'No documentation files were created or modified',
            });
        }
        return {
            valid: issues.filter((i) => i.severity === 'error').length === 0,
            issues,
            suggestions: docFiles.length === 0
                ? ['Verify the target scope and documentation type']
                : [],
        };
    }
    buildSystemPrompt(context) {
        const docType = context.task.options.docType || 'readme';
        return `You are a Documentation Agent specialized in creating and maintaining high-quality documentation for software projects.

Your responsibilities:
1. Analyze the codebase to understand its structure, components, and functionality
2. Generate clear, accurate, and well-organized documentation
3. Follow existing documentation style and conventions when present
4. Include practical examples and code snippets where appropriate
5. Ensure documentation is complete but concise

Documentation Types You Handle:
- README.md: Project overview, installation, usage, and contribution guidelines
- API documentation: Function signatures, parameters, return values, and examples
- CHANGELOG.md: Version history with categorized changes (Added, Changed, Fixed, etc.)
- Architecture docs: System design, component interactions, data flow

Best Practices:
- Use clear, consistent headings and structure
- Include code examples with proper syntax highlighting
- Document public APIs thoroughly, including edge cases
- Keep README focused on getting started quickly
- For changelogs, follow Keep a Changelog format (https://keepachangelog.com)
- Use relative links for internal references
- Include badges for build status, coverage, etc. when appropriate

Current documentation task: ${docType}

Available tools:
${Array.from(context.tools.keys()).join(', ')}

Working directory: ${context.workingDirectory}
Max iterations: ${context.maxIterations}

When you have completed the documentation, provide a summary of:
- Documentation files created/modified
- Key sections added or updated
- Any areas that need manual review`;
    }
    buildInitialPrompt(context) {
        const docType = context.task.options.docType || 'readme';
        const scope = context.task.target?.files?.join(', ') ||
            context.task.target?.pattern ||
            context.workingDirectory;
        let instructions = '';
        switch (docType) {
            case 'readme':
                instructions = `Generate a comprehensive README.md for the project. Include:
- Project title and description
- Key features and capabilities
- Installation instructions
- Quick start / usage examples
- Configuration options
- API overview (if applicable)
- Contributing guidelines
- License information

Make it inviting for new users and helpful for existing ones.`;
                break;
            case 'api':
                instructions = `Generate API documentation for the codebase. Include:
- Overview of the API structure
- All public exports (functions, classes, types)
- Function signatures with parameter descriptions
- Return value documentation
- Usage examples for key APIs
- Type definitions and interfaces

Use JSDoc-style documentation where appropriate.`;
                break;
            case 'changelog':
                instructions = `Generate or update the CHANGELOG.md based on git history. Include:
- Version headers with dates
- Categorized changes: Added, Changed, Deprecated, Removed, Fixed, Security
- Brief descriptions of each change
- References to related issues/PRs when available

Follow the Keep a Changelog format.`;
                break;
            case 'architecture':
                instructions = `Generate architecture documentation for the project. Include:
- High-level system overview
- Component diagram (as ASCII or Mermaid)
- Key design patterns used
- Data flow descriptions
- Important technical decisions and rationale
- Directory structure explanation`;
                break;
            default:
                instructions = `Generate comprehensive documentation for the project based on the scope and requirements.`;
        }
        return `Task: Generate ${docType} documentation
Scope: ${scope}

${instructions}

Task description: ${context.task.description}

Options:
- Output path: ${context.task.options.outputPath || 'auto-detect'}
- Include examples: ${context.task.options.includeExamples ?? true}
- Format: ${context.task.options.format || 'markdown'}

Please:
1. First, analyze the project structure and existing documentation
2. Read relevant source files to understand the codebase
3. Generate the documentation following best practices
4. Save the documentation to the appropriate location

Begin by analyzing the project structure.`;
    }
}
//# sourceMappingURL=docs-agent.js.map