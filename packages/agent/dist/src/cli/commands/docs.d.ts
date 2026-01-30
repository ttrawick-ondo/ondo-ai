import type { Command } from 'commander';
export interface DocsCommandOptions {
    type?: 'readme' | 'api' | 'changelog' | 'architecture' | 'all';
    scope?: string;
    output?: string;
    examples?: boolean;
    verbose?: boolean;
    autoApprove?: boolean;
    dryRun?: boolean;
    commit?: boolean;
}
export declare function registerDocsCommand(program: Command): void;
//# sourceMappingURL=docs.d.ts.map