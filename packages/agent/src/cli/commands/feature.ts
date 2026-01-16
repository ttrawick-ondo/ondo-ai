import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import type { Command } from 'commander'
import { Orchestrator, createInteractiveApprovalHandler, createAutoApproveHandler } from '../../orchestrator/index.js'
import { loadConfig } from '../../config/index.js'
import { createSpinner } from '../ui/spinner.js'
import { select, input, editor } from '../ui/prompts.js'

export interface FeatureCommandOptions {
  spec?: string
  specFile?: string
  interactive?: boolean
  autoApprove?: boolean
  verbose?: boolean
  dryRun?: boolean
}

export function registerFeatureCommand(program: Command): void {
  program
    .command('feature')
    .description('Implement a new feature based on a specification')
    .option('-s, --spec <spec>', 'Feature specification (inline)')
    .option('-f, --spec-file <file>', 'Feature specification file')
    .option('-i, --interactive', 'Interactive mode for plan review', true)
    .option('-a, --auto-approve', 'Auto-approve all actions without prompting', false)
    .option('-v, --verbose', 'Verbose output', false)
    .option('--dry-run', 'Show what would be done without making changes', false)
    .action(async (options: FeatureCommandOptions) => {
      const spinner = createSpinner('Initializing Feature Agent...')

      try {
        // Get feature specification
        let featureSpec: string

        if (options.spec) {
          featureSpec = options.spec
        } else if (options.specFile) {
          const specPath = path.resolve(process.cwd(), options.specFile)
          featureSpec = await fs.readFile(specPath, 'utf-8')
        } else {
          // Prompt for specification
          const inputMethod = await select({
            message: 'How would you like to provide the feature specification?',
            choices: [
              { name: 'Type it now', value: 'inline' },
              { name: 'Open editor', value: 'editor' },
              { name: 'Specify a file', value: 'file' },
            ],
          })

          if (inputMethod === 'inline') {
            featureSpec = await input({
              message: 'Describe the feature:',
              validate: (val) => val.length > 10 || 'Please provide a more detailed description',
            })
          } else if (inputMethod === 'editor') {
            featureSpec = await editor({
              message: 'Write your feature specification:',
              default: '# Feature Specification\n\n## Description\n\n## Requirements\n\n## Acceptance Criteria\n',
            })
          } else {
            const filePath = await input({
              message: 'Path to specification file:',
              validate: (val) => val.length > 0 || 'Please enter a file path',
            })
            featureSpec = await fs.readFile(path.resolve(process.cwd(), filePath), 'utf-8')
          }
        }

        // Load config
        spinner.start('Loading configuration...')
        const config = await loadConfig(process.cwd())
        spinner.succeed('Configuration loaded')

        // Create orchestrator
        const orchestrator = new Orchestrator({
          config,
          workingDirectory: process.cwd(),
        })

        // Set up approval handler for supervised execution
        if (options.autoApprove) {
          orchestrator.setApprovalHandler(createAutoApproveHandler())
        } else if (options.interactive !== false) {
          orchestrator.setApprovalHandler(
            createInteractiveApprovalHandler(async (message, opts) => {
              return select({
                message,
                choices: opts.map((o) => ({ name: o, value: o })),
              })
            })
          )
        }

        // Set up event handlers
        orchestrator.setEventHandlers({
          onTaskStarted: (task) => {
            spinner.start(`Running: ${task.title}`)
          },
          onTaskCompleted: (task, result) => {
            spinner.succeed(`Completed: ${task.title}`)
            if (options.verbose) {
              console.log('\nSummary:')
              console.log(result.summary)
            }
          },
          onTaskFailed: (task, error) => {
            spinner.fail(`Failed: ${task.title}`)
            console.error(`Error: ${error}`)
          },
          onApprovalRequired: (task) => {
            spinner.info(`Approval required for: ${task.title}`)
          },
          onAgentEvent: (event) => {
            if (options.verbose) {
              if (event.type === 'thinking') {
                console.log(`[Agent] ${event.data.message}`)
              } else if (event.type === 'tool_call') {
                console.log(`[Tool] ${event.data.toolName}`)
              }
            }
          },
        })

        // Extract title from spec (first line or first heading)
        const titleMatch = featureSpec.match(/^#?\s*(.+)$/m)
        const title = titleMatch ? titleMatch[1].trim() : 'New Feature'

        // Create task
        const task = orchestrator.createTask({
          type: 'feature',
          title: `Implement: ${title}`,
          description: featureSpec,
          options: {
            featureSpec,
            verbose: options.verbose,
            dryRun: options.dryRun,
          },
        })

        if (options.dryRun) {
          console.log('\n[DRY RUN] Would implement feature:')
          console.log('Title:', task.title)
          console.log('Specification:')
          console.log(featureSpec)
          return
        }

        // Run task
        spinner.start('Running Feature Agent...')
        const result = await orchestrator.runTask(task.id)

        if (result.success) {
          spinner.succeed('Feature implementation completed')

          console.log('\n' + '='.repeat(50))
          console.log('IMPLEMENTATION COMPLETE')
          console.log('='.repeat(50))
          console.log(result.summary)

          if (result.changes.length > 0) {
            console.log('\nFiles changed:')
            for (const change of result.changes) {
              const symbol = change.type === 'created' ? '+' : change.type === 'deleted' ? '-' : '~'
              console.log(`  ${symbol} ${change.path}`)
            }
          }

          console.log('='.repeat(50) + '\n')
        } else {
          spinner.fail('Feature implementation failed')
          console.error('\nError:', result.error)
          process.exit(1)
        }
      } catch (error) {
        spinner.fail('Error')
        console.error(
          'Failed to run feature command:',
          error instanceof Error ? error.message : error
        )
        process.exit(1)
      }
    })
}
