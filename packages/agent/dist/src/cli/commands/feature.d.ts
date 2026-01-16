import type { Command } from 'commander';
export interface FeatureCommandOptions {
    spec?: string;
    specFile?: string;
    interactive?: boolean;
    verbose?: boolean;
    dryRun?: boolean;
}
export declare function registerFeatureCommand(program: Command): void;
//# sourceMappingURL=feature.d.ts.map