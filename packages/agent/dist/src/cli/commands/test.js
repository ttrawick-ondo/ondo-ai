import { Orchestrator } from '../../orchestrator/index.js';
import { loadConfig } from '../../config/index.js';
import { createSpinner } from '../ui/spinner.js';
export function registerTestCommand(program) {
    program
        .command('test')
        .description('Generate, run, and fix tests for specified files')
        .option('-t, --target <file>', 'Target file to generate tests for')
        .option('-p, --pattern <pattern>', 'Glob pattern to match files')
        .option('-c, --coverage', 'Generate coverage report', false)
        .option('--coverage-target <percent>', 'Minimum coverage target', '80')
        .option('--fix', 'Auto-fix failing tests', false)
        .option('-w, --watch', 'Watch mode', false)
        .option('-v, --verbose', 'Verbose output', false)
        .action(async (options) => {
        const spinner = createSpinner('Initializing Test Agent...');
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
                onAgentEvent: (event) => {
                    if (options.verbose && event.type === 'thinking') {
                        console.log(`[Agent] ${event.data.message}`);
                    }
                },
            });
            // Determine target files
            let targetFiles;
            if (options.target) {
                targetFiles = [options.target];
            }
            // Create task
            const task = orchestrator.createTask({
                type: 'test',
                title: options.target
                    ? `Generate tests for ${options.target}`
                    : 'Generate tests for project',
                description: options.target
                    ? `Generate comprehensive tests for ${options.target}`
                    : `Generate tests matching pattern: ${options.pattern || '**/*.ts'}`,
                target: {
                    files: targetFiles,
                    pattern: options.pattern,
                },
                options: {
                    coverageTarget: options.coverageTarget
                        ? parseInt(String(options.coverageTarget), 10)
                        : 80,
                    autoFix: options.fix,
                    verbose: options.verbose,
                },
            });
            // Run task
            spinner.start('Running Test Agent...');
            const result = await orchestrator.runTask(task.id);
            if (result.success) {
                spinner.succeed('Test generation completed successfully');
                // Show summary
                console.log('\n' + '='.repeat(50));
                console.log('TEST RESULTS');
                console.log('='.repeat(50));
                console.log(result.summary);
                if (result.changes.length > 0) {
                    console.log('\nFiles:');
                    for (const change of result.changes) {
                        console.log(`  ${change.type === 'created' ? '+' : '~'} ${change.path}`);
                    }
                }
                console.log('='.repeat(50) + '\n');
            }
            else {
                spinner.fail('Test generation failed');
                console.error('\nError:', result.error);
                process.exit(1);
            }
        }
        catch (error) {
            spinner.fail('Error');
            console.error('Failed to run test command:', error instanceof Error ? error.message : error);
            process.exit(1);
        }
    });
}
//# sourceMappingURL=test.js.map