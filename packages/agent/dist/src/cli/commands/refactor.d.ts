import type { Command } from 'commander';
import type { RefactorType } from '../../types/index.js';
export interface RefactorCommandOptions {
    scope?: string;
    type?: RefactorType;
    interactive?: boolean;
    verbose?: boolean;
    dryRun?: boolean;
}
export declare function registerRefactorCommand(program: Command): void;
//# sourceMappingURL=refactor.d.ts.map