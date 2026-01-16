import { Orchestrator, createInteractiveApprovalHandler } from '../../orchestrator/index.js';
import { loadConfig } from '../../config/index.js';
import { createSpinner } from '../ui/spinner.js';
import { select, input } from '../ui/prompts.js';
const REFACTOR_TYPES = [
    { name: 'Simplify', value: 'simplify', description: 'Reduce complexity and improve readability' },
    { name: 'Extract Function', value: 'extract-function', description: 'Extract code into reusable functions' },
    { name: 'Extract Component', value: 'extract-component', description: 'Extract UI into separate React components' },
    { name: 'Rename', value: 'rename', description: 'Rename symbols for clarity' },
    { name: 'Move', value: 'move', description: 'Move code to better locations' },
    { name: 'Optimize', value: 'optimize', description: 'Improve performance' },
    { name: 'Modernize', value: 'modernize', description: 'Update to modern patterns' },
];
export function registerRefactorCommand(program) {
    program
        .command('refactor')
        .description('Refactor code to improve quality while preserving behavior')
        .option('-s, --scope <path>', 'File or directory to refactor')
        .option('-t, --type <type>', 'Refactor type (simplify, extract-function, extract-component, rename, move, optimize, modernize)')
        .option('-i, --interactive', 'Interactive mode for plan review', true)
        .option('-v, --verbose', 'Verbose output', false)
        .option('--dry-run', 'Show what would be done without making changes', false)
        .action(async (options) => {
        const spinner = createSpinner('Initializing Refactor Agent...');
        try {
            // Get scope
            let scope = options.scope;
            if (!scope) {
                scope = await input({
                    message: 'Enter file or directory to refactor:',
                    default: 'src',
                    validate: (val) => val.length > 0 || 'Please specify a scope',
                });
            }
            // Get refactor type
            let refactorType = options.type;
            if (!refactorType) {
                refactorType = await select({
                    message: 'What type of refactoring?',
                    choices: REFACTOR_TYPES,
                    default: 'simplify',
                });
            }
            // Load config
            spinner.start('Loading configuration...');
            const config = await loadConfig(process.cwd());
            spinner.succeed('Configuration loaded');
            // Create orchestrator
            const orchestrator = new Orchestrator({
                config,
                workingDirectory: process.cwd(),
            });
            // Set up approval handler
            if (options.interactive !== false) {
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
                    }
                },
                onTaskFailed: (task, error) => {
                    spinner.fail(`Failed: ${task.title}`);
                    console.error(`Error: ${error}`);
                },
                onApprovalRequired: (task) => {
                    spinner.info(`Approval required for: ${task.title}`);
                },
                onAgentEvent: (event) => {
                    if (options.verbose && event.type === 'thinking') {
                        console.log(`[Agent] ${event.data.message}`);
                    }
                },
            });
            // Determine if scope is file or directory
            const isDirectory = !scope.includes('.');
            const target = isDirectory
                ? { directories: [scope] }
                : { files: [scope] };
            // Create task
            const task = orchestrator.createTask({
                type: 'refactor',
                title: `Refactor (${refactorType}): ${scope}`,
                description: `Perform ${refactorType} refactoring on ${scope}`,
                target,
                options: {
                    refactorType,
                    verbose: options.verbose,
                    dryRun: options.dryRun,
                },
            });
            if (options.dryRun) {
                console.log('\n[DRY RUN] Would refactor:');
                console.log('Scope:', scope);
                console.log('Type:', refactorType);
                return;
            }
            // Run task
            spinner.start('Running Refactor Agent...');
            const result = await orchestrator.runTask(task.id);
            if (result.success) {
                spinner.succeed('Refactoring completed');
                console.log('\n' + '='.repeat(50));
                console.log('REFACTORING COMPLETE');
                console.log('='.repeat(50));
                console.log(result.summary);
                if (result.changes.length > 0) {
                    console.log('\nFiles changed:');
                    for (const change of result.changes) {
                        const symbol = change.type === 'created' ? '+' : change.type === 'deleted' ? '-' : '~';
                        console.log(`  ${symbol} ${change.path}`);
                    }
                }
                console.log('='.repeat(50) + '\n');
            }
            else {
                spinner.fail('Refactoring failed');
                console.error('\nError:', result.error);
                process.exit(1);
            }
        }
        catch (error) {
            spinner.fail('Error');
            console.error('Failed to run refactor command:', error instanceof Error ? error.message : error);
            process.exit(1);
        }
    });
}
//# sourceMappingURL=refactor.js.map