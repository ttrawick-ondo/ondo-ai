export interface ConfirmOptions {
    message: string;
    default?: boolean;
}
export interface SelectOptions<T> {
    message: string;
    choices: Array<{
        name: string;
        value: T;
        description?: string;
    }>;
    default?: T;
}
export interface InputOptions {
    message: string;
    default?: string;
    validate?: (input: string) => boolean | string;
}
export interface CheckboxOptions<T> {
    message: string;
    choices: Array<{
        name: string;
        value: T;
        checked?: boolean;
    }>;
}
export declare function confirm(options: ConfirmOptions): Promise<boolean>;
export declare function select<T>(options: SelectOptions<T>): Promise<T>;
export declare function input(options: InputOptions): Promise<string>;
export declare function checkbox<T>(options: CheckboxOptions<T>): Promise<T[]>;
export declare function password(message: string): Promise<string>;
export declare function editor(options: {
    message: string;
    default?: string;
}): Promise<string>;
export declare function promptApproval(summary: string, risks: string[]): Promise<'approve' | 'reject' | 'modify'>;
export declare function promptFileSelection(files: string[], message?: string): Promise<string[]>;
export declare function promptTaskOptions(taskType: string): Promise<{
    target?: string;
    coverageTarget?: number;
    dryRun?: boolean;
    verbose?: boolean;
}>;
//# sourceMappingURL=prompts.d.ts.map