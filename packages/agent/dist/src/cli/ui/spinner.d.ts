export interface SpinnerOptions {
    text?: string;
    color?: 'black' | 'red' | 'green' | 'yellow' | 'blue' | 'magenta' | 'cyan' | 'white' | 'gray';
}
export declare class Spinner {
    private spinner;
    constructor(options?: SpinnerOptions);
    start(text?: string): this;
    stop(): this;
    succeed(text?: string): this;
    fail(text?: string): this;
    warn(text?: string): this;
    info(text?: string): this;
    text(text: string): this;
    isSpinning(): boolean;
}
export declare function createSpinner(text?: string): Spinner;
export declare class Progress {
    private spinner;
    private steps;
    private currentStep;
    private totalSteps;
    constructor(steps: string[]);
    start(): this;
    next(): this;
    complete(): this;
    fail(message?: string): this;
    private updateText;
}
export declare function createProgress(steps: string[]): Progress;
//# sourceMappingURL=spinner.d.ts.map