import type { Command } from 'commander';
export interface SecurityCommandOptions {
    type?: 'full' | 'dependencies' | 'secrets' | 'sast';
    scope?: string;
    output?: string;
    severity?: 'critical' | 'high' | 'medium' | 'low' | 'info';
    verbose?: boolean;
    autoApprove?: boolean;
    dryRun?: boolean;
    fix?: boolean;
}
export declare function registerSecurityCommand(program: Command): void;
//# sourceMappingURL=security.d.ts.map