import type { Command } from 'commander';
export interface QACommandOptions {
    preCommit?: boolean;
    typeCheck?: boolean;
    lint?: boolean;
    test?: boolean;
    coverage?: boolean;
    verbose?: boolean;
    fix?: boolean;
}
export declare function registerQACommand(program: Command): void;
//# sourceMappingURL=qa.d.ts.map