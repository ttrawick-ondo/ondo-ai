import ora from 'ora';
export class Spinner {
    spinner;
    constructor(options = {}) {
        this.spinner = ora({
            text: options.text || 'Loading...',
            color: options.color || 'cyan',
        });
    }
    start(text) {
        if (text) {
            this.spinner.text = text;
        }
        this.spinner.start();
        return this;
    }
    stop() {
        this.spinner.stop();
        return this;
    }
    succeed(text) {
        this.spinner.succeed(text);
        return this;
    }
    fail(text) {
        this.spinner.fail(text);
        return this;
    }
    warn(text) {
        this.spinner.warn(text);
        return this;
    }
    info(text) {
        this.spinner.info(text);
        return this;
    }
    text(text) {
        this.spinner.text = text;
        return this;
    }
    isSpinning() {
        return this.spinner.isSpinning;
    }
}
export function createSpinner(text) {
    return new Spinner({ text });
}
// Progress indicator for multi-step operations
export class Progress {
    spinner;
    steps;
    currentStep;
    totalSteps;
    constructor(steps) {
        this.steps = steps;
        this.currentStep = 0;
        this.totalSteps = steps.length;
        this.spinner = new Spinner();
    }
    start() {
        this.currentStep = 0;
        this.updateText();
        this.spinner.start();
        return this;
    }
    next() {
        this.currentStep++;
        if (this.currentStep < this.totalSteps) {
            this.updateText();
        }
        return this;
    }
    complete() {
        this.spinner.succeed(`Completed ${this.totalSteps}/${this.totalSteps} steps`);
        return this;
    }
    fail(message) {
        this.spinner.fail(message || `Failed at step ${this.currentStep + 1}/${this.totalSteps}`);
        return this;
    }
    updateText() {
        const step = this.steps[this.currentStep];
        this.spinner.text(`[${this.currentStep + 1}/${this.totalSteps}] ${step}`);
    }
}
export function createProgress(steps) {
    return new Progress(steps);
}
//# sourceMappingURL=spinner.js.map