import ora, { type Ora } from 'ora'

export interface SpinnerOptions {
  text?: string
  color?: 'black' | 'red' | 'green' | 'yellow' | 'blue' | 'magenta' | 'cyan' | 'white' | 'gray'
}

export class Spinner {
  private spinner: Ora

  constructor(options: SpinnerOptions = {}) {
    this.spinner = ora({
      text: options.text || 'Loading...',
      color: options.color || 'cyan',
    })
  }

  start(text?: string): this {
    if (text) {
      this.spinner.text = text
    }
    this.spinner.start()
    return this
  }

  stop(): this {
    this.spinner.stop()
    return this
  }

  succeed(text?: string): this {
    this.spinner.succeed(text)
    return this
  }

  fail(text?: string): this {
    this.spinner.fail(text)
    return this
  }

  warn(text?: string): this {
    this.spinner.warn(text)
    return this
  }

  info(text?: string): this {
    this.spinner.info(text)
    return this
  }

  text(text: string): this {
    this.spinner.text = text
    return this
  }

  isSpinning(): boolean {
    return this.spinner.isSpinning
  }
}

export function createSpinner(text?: string): Spinner {
  return new Spinner({ text })
}

// Progress indicator for multi-step operations
export class Progress {
  private spinner: Spinner
  private steps: string[]
  private currentStep: number
  private totalSteps: number

  constructor(steps: string[]) {
    this.steps = steps
    this.currentStep = 0
    this.totalSteps = steps.length
    this.spinner = new Spinner()
  }

  start(): this {
    this.currentStep = 0
    this.updateText()
    this.spinner.start()
    return this
  }

  next(): this {
    this.currentStep++
    if (this.currentStep < this.totalSteps) {
      this.updateText()
    }
    return this
  }

  complete(): this {
    this.spinner.succeed(`Completed ${this.totalSteps}/${this.totalSteps} steps`)
    return this
  }

  fail(message?: string): this {
    this.spinner.fail(message || `Failed at step ${this.currentStep + 1}/${this.totalSteps}`)
    return this
  }

  private updateText(): void {
    const step = this.steps[this.currentStep]
    this.spinner.text(`[${this.currentStep + 1}/${this.totalSteps}] ${step}`)
  }
}

export function createProgress(steps: string[]): Progress {
  return new Progress(steps)
}
