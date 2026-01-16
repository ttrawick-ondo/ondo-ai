import type { Command } from 'commander';
export interface TestCommandOptions {
    target?: string;
    pattern?: string;
    coverage?: boolean;
    coverageTarget?: number;
    fix?: boolean;
    watch?: boolean;
    verbose?: boolean;
}
export declare function registerTestCommand(program: Command): void;
//# sourceMappingURL=test.d.ts.map