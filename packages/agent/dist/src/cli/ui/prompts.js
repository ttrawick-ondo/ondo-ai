import inquirer from 'inquirer';
export async function confirm(options) {
    const { confirmed } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'confirmed',
            message: options.message,
            default: options.default ?? true,
        },
    ]);
    return confirmed;
}
export async function select(options) {
    const { selected } = await inquirer.prompt([
        {
            type: 'list',
            name: 'selected',
            message: options.message,
            choices: options.choices,
            default: options.default,
        },
    ]);
    return selected;
}
export async function input(options) {
    const { value } = await inquirer.prompt([
        {
            type: 'input',
            name: 'value',
            message: options.message,
            default: options.default,
            validate: options.validate,
        },
    ]);
    return value;
}
export async function checkbox(options) {
    const { selected } = await inquirer.prompt([
        {
            type: 'checkbox',
            name: 'selected',
            message: options.message,
            choices: options.choices,
        },
    ]);
    return selected;
}
export async function password(message) {
    const { value } = await inquirer.prompt([
        {
            type: 'password',
            name: 'value',
            message,
            mask: '*',
        },
    ]);
    return value;
}
export async function editor(options) {
    const { value } = await inquirer.prompt([
        {
            type: 'editor',
            name: 'value',
            message: options.message,
            default: options.default,
        },
    ]);
    return value;
}
// Specialized prompts for the agent system
export async function promptApproval(summary, risks) {
    console.log('\n' + '='.repeat(60));
    console.log('APPROVAL REQUIRED');
    console.log('='.repeat(60));
    console.log(summary);
    if (risks.length > 0) {
        console.log('\nRisks:');
        for (const risk of risks) {
            console.log(`  - ${risk}`);
        }
    }
    console.log('='.repeat(60) + '\n');
    return select({
        message: 'What would you like to do?',
        choices: [
            { name: 'Approve and proceed', value: 'approve' },
            { name: 'Reject', value: 'reject' },
            { name: 'Modify plan', value: 'modify' },
        ],
        default: 'approve',
    });
}
export async function promptFileSelection(files, message = 'Select files') {
    if (files.length === 0) {
        return [];
    }
    return checkbox({
        message,
        choices: files.map((f) => ({ name: f, value: f })),
    });
}
export async function promptTaskOptions(taskType) {
    const options = {};
    if (taskType === 'test') {
        options.coverageTarget = parseInt(await input({
            message: 'Coverage target (%)',
            default: '80',
            validate: (val) => {
                const num = parseInt(val);
                return num >= 0 && num <= 100 ? true : 'Must be between 0 and 100';
            },
        }), 10);
    }
    options.dryRun = await confirm({
        message: 'Run in dry-run mode (no changes)?',
        default: false,
    });
    options.verbose = await confirm({
        message: 'Enable verbose output?',
        default: false,
    });
    return options;
}
//# sourceMappingURL=prompts.js.map