import { Orchestrator } from '../../orchestrator/index.js';
import { loadConfig } from '../../config/index.js';
import { createSpinner } from '../ui/spinner.js';
import { select } from '../ui/prompts.js';
import { createInteractiveApprovalHandler, createAutoApproveHandler, } from '../../orchestrator/approval-gate.js';
export function registerSecurityCommand(program) {
    program
        .command('security')
        .description('Perform security auditing and vulnerability scanning')
        .option('-t, --type <type>', 'Scan type: full, dependencies, secrets, sast', 'full')
        .option('-s, --scope <path>', 'Scope to specific directory or files')
        .option('-o, --output <path>', 'Output path for security report', 'SECURITY-AUDIT.md')
        .option('--severity <level>', 'Minimum severity to report: critical, high, medium, low, info', 'info')
        .option('-v, --verbose', 'Verbose output', false)
        .option('-a, --auto-approve', 'Auto-approve all actions without prompting', false)
        .option('--dry-run', 'Show what would be done without making changes', false)
        .option('--fix', 'Attempt to auto-fix security issues where possible', false)
        .action(async (options) => {
        const spinner = createSpinner('Initializing Security Agent...');
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
                full: 'Comprehensive security audit: dependencies, secrets, and static analysis',
                dependencies: 'Scan dependencies for known vulnerabilities (CVEs)',
                secrets: 'Detect hardcoded secrets, API keys, and credentials',
                sast: 'Static Application Security Testing for code vulnerabilities',
            };
            const scanType = options.type || 'full';
            const scope = options.scope || process.cwd();
            // Create task
            const task = orchestrator.createTask({
                type: 'security',
                title: `Security Audit (${scanType})`,
                description: typeDescriptions[scanType] || typeDescriptions.full,
                target: {
                    files: options.scope ? [options.scope] : undefined,
                    pattern: options.scope,
                },
                options: {
                    scanType,
                    reportPath: options.output,
                    severityThreshold: options.severity,
                    verbose: options.verbose,
                    dryRun: options.dryRun,
                    autoFix: options.fix,
                },
            });
            if (options.dryRun) {
                console.log('\n[DRY RUN] Would execute the following security scan:');
                console.log(`  Type: ${task.type}`);
                console.log(`  Title: ${task.title}`);
                console.log(`  Description: ${task.description}`);
                console.log(`  Scope: ${scope}`);
                console.log(`  Scan Type: ${scanType}`);
                console.log(`  Report Output: ${options.output}`);
                console.log(`  Severity Threshold: ${options.severity}`);
                console.log(`  Auto-fix: ${options.fix}`);
                return;
            }
            // Run task
            spinner.start('Running Security Agent...');
            const result = await orchestrator.runTask(task.id);
            if (result.success) {
                spinner.succeed('Security audit completed');
                // Show summary
                console.log('\n' + '='.repeat(60));
                console.log('SECURITY AUDIT RESULTS');
                console.log('='.repeat(60));
                console.log(result.summary);
                if (result.changes.length > 0) {
                    console.log('\nFiles:');
                    for (const change of result.changes) {
                        const icon = change.type === 'created' ? '+' : change.type === 'modified' ? '~' : '-';
                        console.log(`  ${icon} ${change.path}`);
                    }
                }
                // Show severity legend
                console.log('\nSeverity Legend:');
                console.log('  [C] Critical - Immediate action required');
                console.log('  [H] High - Should be fixed soon');
                console.log('  [M] Medium - Should be addressed');
                console.log('  [L] Low - Consider fixing');
                console.log('  [I] Info - For your awareness');
                console.log('='.repeat(60) + '\n');
            }
            else {
                spinner.fail('Security audit failed');
                console.error('\nError:', result.error);
                process.exit(1);
            }
        }
        catch (error) {
            spinner.fail('Error');
            console.error('Failed to run security command:', error instanceof Error ? error.message : error);
            process.exit(1);
        }
    });
}
//# sourceMappingURL=security.js.map