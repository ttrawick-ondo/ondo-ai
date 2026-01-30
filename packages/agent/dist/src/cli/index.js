import { Command } from 'commander';
import { registerTestCommand } from './commands/test.js';
import { registerFeatureCommand } from './commands/feature.js';
import { registerRefactorCommand } from './commands/refactor.js';
import { registerQACommand } from './commands/qa.js';
import { registerDocsCommand } from './commands/docs.js';
import { registerSecurityCommand } from './commands/security.js';
const VERSION = '0.1.0';
export function createCLI() {
    const program = new Command();
    program
        .name('ondo-agent')
        .description('Autonomous agent system for testing, QA, and code generation')
        .version(VERSION);
    // Register commands
    registerTestCommand(program);
    registerFeatureCommand(program);
    registerRefactorCommand(program);
    registerQACommand(program);
    registerDocsCommand(program);
    registerSecurityCommand(program);
    // Global options
    program
        .option('-c, --config <path>', 'Path to config file', '.ondo-agent.json')
        .option('--api-key <key>', 'Anthropic API key (or set ANTHROPIC_API_KEY env var)');
    return program;
}
export function run() {
    const program = createCLI();
    program.parse();
}
// Re-export for testing
export { registerTestCommand } from './commands/test.js';
export { registerFeatureCommand } from './commands/feature.js';
export { registerRefactorCommand } from './commands/refactor.js';
export { registerQACommand } from './commands/qa.js';
export { registerDocsCommand } from './commands/docs.js';
export { registerSecurityCommand } from './commands/security.js';
//# sourceMappingURL=index.js.map