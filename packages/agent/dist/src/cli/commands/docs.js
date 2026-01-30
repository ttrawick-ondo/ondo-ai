import { Orchestrator } from '../../orchestrator/index.js';
import { loadConfig } from '../../config/index.js';
import { createSpinner } from '../ui/spinner.js';
import { select } from '../ui/prompts.js';
import { createInteractiveApprovalHandler, createAutoApproveHandler, } from '../../orchestrator/approval-gate.js';
export function registerDocsCommand(program) {
    program
        .command('docs')
        .description('Generate and maintain project documentation')
        .option('-t, --type <type>', 'Documentation type: readme, api, changelog, architecture, all', 'readme')
        .option('-s, --scope <path>', 'Scope to specific directory or files')
        .option('-o, --output <path>', 'Output path for generated documentation')
        .option('--examples', 'Include usage examples', true)
        .option('--no-examples', 'Exclude usage examples')
        .option('-v, --verbose', 'Verbose output', false)
        .option('-a, --auto-approve', 'Auto-approve all actions without prompting', false)
        .option('--dry-run', 'Show what would be done without making changes', false)
        .option('--commit', 'Commit documentation changes after generation', false)
        .action(async (options) => {
        const spinner = createSpinner('Initializing Documentation Agent...');
        try {
            // Load config
            spinner.start('Loading configuration...');
            const config = await loadConfig(process.cwd());
            spinner.succeed('Configuration loaded');
            // Create orchestrator
            const orchestrator = new Orchestrator({
                config,
                workingDirectory: process.cwd(),
            });
            // Set approval handler based on options
            if (options.autoApprove) {
                orchestrator.setApprovalHandler(createAutoApproveHandler());
            }
            else {
                orchestrator.setApprovalHandler(createInteractiveApprovalHandler(async (message, opts) => {
                    return select({
                        message,
                        choices: opts.map((o) => ({ name: o, value: o })),
                    });
                }));
            }
            // Set up event handlers
            orchestrator.setEventHandlers({
                onTaskStarted: (task) => {
                    spinner.start(`Running: ${task.title}`);
                },
                onTaskCompleted: (task, result) => {
                    spinner.succeed(`Completed: ${task.title}`);
                    if (options.verbose) {
                        console.log('\nSummary:');
                        console.log(result.summary);
                        console.log('\nFiles modified:');
                        for (const change of result.changes) {
                            console.log(`  ${change.type}: ${change.path}`);
                        }
                    }
                },
                onTaskFailed: (task, error) => {
                    spinner.fail(`Failed: ${task.title}`);
                    console.error(`Error: ${error}`);
                },
                onApprovalRequired: (task) => {
                    spinner.stop();
                    console.log(`\nApproval required for: ${task.title}`);
                },
                onAgentEvent: (event) => {
                    if (options.verbose) {
                        if (event.type === 'thinking') {
                            console.log(`[Agent] ${event.data.message}`);
                        }
                        else if (event.type === 'tool_call') {
                            console.log(`[Tool] ${event.data.toolName}`);
                        }
                    }
                },
            });
            // Build task description based on type
            const typeDescriptions = {
                readme: 'Generate a comprehensive README.md with project overview, installation, and usage',
                api: 'Generate API documentation for all public exports',
                changelog: 'Generate or update CHANGELOG.md from git history',
                architecture: 'Generate architecture documentation with system overview',
                all: 'Generate complete documentation suite',
            };
            const docType = options.type || 'readme';
            const scope = options.scope || process.cwd();
            // Create task
            const task = orchestrator.createTask({
                type: 'docs',
                title: `Generate ${docType} documentation`,
                description: typeDescriptions[docType] || typeDescriptions.readme,
                target: {
                    files: options.scope ? [options.scope] : undefined,
                    pattern: options.scope,
                },
                options: {
                    docType,
                    outputPath: options.output,
                    includeExamples: options.examples,
                    verbose: options.verbose,
                    dryRun: options.dryRun,
                    enableCommit: options.commit,
                },
            });
            if (options.dryRun) {
                console.log('\n[DRY RUN] Would execute the following task:');
                console.log(`  Type: ${task.type}`);
                console.log(`  Title: ${task.title}`);
                console.log(`  Description: ${task.description}`);
                console.log(`  Scope: ${scope}`);
                console.log(`  Doc Type: ${docType}`);
                console.log(`  Output: ${options.output || 'auto-detect'}`);
                return;
            }
            // Run task
            spinner.start('Running Documentation Agent...');
            const result = await orchestrator.runTask(task.id);
            if (result.success) {
                spinner.succeed('Documentation generation completed successfully');
                // Show summary
                console.log('\n' + '='.repeat(50));
                console.log('DOCUMENTATION RESULTS');
                console.log('='.repeat(50));
                console.log(result.summary);
                if (result.changes.length > 0) {
                    console.log('\nFiles:');
                    for (const change of result.changes) {
                        const icon = change.type === 'created' ? '+' : change.type === 'modified' ? '~' : '-';
                        console.log(`  ${icon} ${change.path}`);
                    }
                }
                console.log('='.repeat(50) + '\n');
            }
            else {
                spinner.fail('Documentation generation failed');
                console.error('\nError:', result.error);
                process.exit(1);
            }
        }
        catch (error) {
            spinner.fail('Error');
            console.error('Failed to run docs command:', error instanceof Error ? error.message : error);
            process.exit(1);
        }
    });
}
//# sourceMappingURL=docs.js.map