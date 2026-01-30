import type { Command } from 'commander';
export interface FeatureCommandOptions {
    spec?: string;
    specFile?: string;
    interactive?: boolean;
    autoApprove?: boolean;
    verbose?: boolean;
    dryRun?: boolean;
    commit?: boolean;
}
export declare function registerFeatureCommand(program: Command): void;
//# sourceMappingURL=feature.d.ts.map