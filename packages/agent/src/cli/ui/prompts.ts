import inquirer from 'inquirer'

export interface ConfirmOptions {
  message: string
  default?: boolean
}

export interface SelectOptions<T> {
  message: string
  choices: Array<{ name: string; value: T; description?: string }>
  default?: T
}

export interface InputOptions {
  message: string
  default?: string
  validate?: (input: string) => boolean | string
}

export interface CheckboxOptions<T> {
  message: string
  choices: Array<{ name: string; value: T; checked?: boolean }>
}

export async function confirm(options: ConfirmOptions): Promise<boolean> {
  const { confirmed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message: options.message,
      default: options.default ?? true,
    },
  ])
  return confirmed
}

export async function select<T>(options: SelectOptions<T>): Promise<T> {
  const { selected } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selected',
      message: options.message,
      choices: options.choices,
      default: options.default,
    },
  ])
  return selected
}

export async function input(options: InputOptions): Promise<string> {
  const { value } = await inquirer.prompt([
    {
      type: 'input',
      name: 'value',
      message: options.message,
      default: options.default,
      validate: options.validate,
    },
  ])
  return value
}

export async function checkbox<T>(options: CheckboxOptions<T>): Promise<T[]> {
  const { selected } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selected',
      message: options.message,
      choices: options.choices,
    },
  ])
  return selected
}

export async function password(message: string): Promise<string> {
  const { value } = await inquirer.prompt([
    {
      type: 'password',
      name: 'value',
      message,
      mask: '*',
    },
  ])
  return value
}

export async function editor(options: { message: string; default?: string }): Promise<string> {
  const { value } = await inquirer.prompt([
    {
      type: 'editor',
      name: 'value',
      message: options.message,
      default: options.default,
    },
  ])
  return value
}

// Specialized prompts for the agent system
export async function promptApproval(
  summary: string,
  risks: string[]
): Promise<'approve' | 'reject' | 'modify'> {
  console.log('\n' + '='.repeat(60))
  console.log('APPROVAL REQUIRED')
  console.log('='.repeat(60))
  console.log(summary)

  if (risks.length > 0) {
    console.log('\nRisks:')
    for (const risk of risks) {
      console.log(`  - ${risk}`)
    }
  }

  console.log('='.repeat(60) + '\n')

  return select({
    message: 'What would you like to do?',
    choices: [
      { name: 'Approve and proceed', value: 'approve' as const },
      { name: 'Reject', value: 'reject' as const },
      { name: 'Modify plan', value: 'modify' as const },
    ],
    default: 'approve' as const,
  })
}

export async function promptFileSelection(
  files: string[],
  message = 'Select files'
): Promise<string[]> {
  if (files.length === 0) {
    return []
  }

  return checkbox({
    message,
    choices: files.map((f) => ({ name: f, value: f })),
  })
}

export async function promptTaskOptions(taskType: string): Promise<{
  target?: string
  coverageTarget?: number
  dryRun?: boolean
  verbose?: boolean
}> {
  const options: Record<string, unknown> = {}

  if (taskType === 'test') {
    options.coverageTarget = parseInt(
      await input({
        message: 'Coverage target (%)',
        default: '80',
        validate: (val) => {
          const num = parseInt(val)
          return num >= 0 && num <= 100 ? true : 'Must be between 0 and 100'
        },
      }),
      10
    )
  }

  options.dryRun = await confirm({
    message: 'Run in dry-run mode (no changes)?',
    default: false,
  })

  options.verbose = await confirm({
    message: 'Enable verbose output?',
    default: false,
  })

  return options
}
