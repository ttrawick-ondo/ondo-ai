import type { Command } from 'commander'
import { Orchestrator } from '../../orchestrator/index.js'
import { loadConfig } from '../../config/index.js'
import { createSpinner } from '../ui/spinner.js'

export interface QACommandOptions {
  preCommit?: boolean
  typeCheck?: boolean
  lint?: boolean
  test?: boolean
  coverage?: boolean
  verbose?: boolean
  fix?: boolean
}

export function registerQACommand(program: Command): void {
  program
    .command('qa')
    .description('Run quality assurance checks (type checking, linting, tests)')
    .option('--pre-commit', 'Pre-commit mode (fail on any issue)', false)
    .option('--type-check', 'Run TypeScript type checking', true)
    .option('--lint', 'Run ESLint', true)
    .option('--test', 'Run tests', true)
    .option('--coverage', 'Include coverage report', false)
    .option('--fix', 'Auto-fix issues where possible', false)
    .option('-v, --verbose', 'Verbose output', false)
    .action(async (options: QACommandOptions) => {
      const spinner = createSpinner('Initializing QA Agent...')

      try {
        // Load config
        spinner.start('Loading configuration...')
        const config = await loadConfig(process.cwd())
        spinner.succeed('Configuration loaded')

        // Create orchestrator
        const orchestrator = new Orchestrator({
          config,
          workingDirectory: process.cwd(),
        })

        // Track results
        const results: {
          typeCheck: { passed: boolean; issues: number } | null
          lint: { passed: boolean; errors: number; warnings: number } | null
          tests: { passed: boolean; total: number; failed: number } | null
          coverage: { lines: number; branches: number; functions: number } | null
        } = {
          typeCheck: null,
          lint: null,
          tests: null,
          coverage: null,
        }

        // Set up event handlers
        orchestrator.setEventHandlers({
          onTaskStarted: (task) => {
            spinner.start(`Running: ${task.title}`)
          },
          onTaskCompleted: (task, result) => {
            spinner.succeed(`Completed: ${task.title}`)

            // Extract results from tool outputs
            for (const toolUse of result.toolsUsed) {
              if (toolUse.toolName === 'runTypeCheck') {
                results.typeCheck = {
                  passed: toolUse.result.success,
                  issues: (toolUse.result.metadata as { errorCount?: number })?.errorCount || 0,
                }
              } else if (toolUse.toolName === 'runEslint') {
                const meta = toolUse.result.metadata as { errorCount?: number; warningCount?: number }
                results.lint = {
                  passed: toolUse.result.success,
                  errors: meta?.errorCount || 0,
                  warnings: meta?.warningCount || 0,
                }
              } else if (toolUse.toolName === 'runTests') {
                const meta = toolUse.result.metadata as { passed?: number; failed?: number; total?: number }
                results.tests = {
                  passed: toolUse.result.success,
                  total: meta?.total || 0,
                  failed: meta?.failed || 0,
                }
              } else if (toolUse.toolName === 'getCoverage') {
                const meta = toolUse.result.metadata as { coverage?: { lines: number; branches: number; functions: number } }
                if (meta?.coverage) {
                  results.coverage = meta.coverage
                }
              }
            }
          },
          onTaskFailed: (task, error) => {
            spinner.fail(`Failed: ${task.title}`)
            if (options.verbose) {
              console.error(`Error: ${error}`)
            }
          },
          onAgentEvent: (event) => {
            if (options.verbose && event.type === 'tool_result') {
              console.log(`[${event.data.toolName}] ${event.data.toolResult?.success ? 'OK' : 'FAILED'}`)
            }
          },
        })

        // Build description based on enabled checks
        const enabledChecks = []
        if (options.typeCheck !== false) enabledChecks.push('type checking')
        if (options.lint !== false) enabledChecks.push('linting')
        if (options.test !== false) enabledChecks.push('tests')
        if (options.coverage) enabledChecks.push('coverage')

        // Create task
        const task = orchestrator.createTask({
          type: 'qa',
          title: options.preCommit ? 'Pre-commit QA Checks' : 'QA Validation',
          description: `Run ${enabledChecks.join(', ')}`,
          options: {
            verbose: options.verbose,
            autoFix: options.fix,
          },
        })

        // Run task
        spinner.start('Running QA checks...')
        await orchestrator.runTask(task.id)

        // Print results
        console.log('\n' + '='.repeat(50))
        console.log('QA RESULTS')
        console.log('='.repeat(50))

        if (results.typeCheck) {
          const status = results.typeCheck.passed ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m'
          console.log(`Type Check: ${status} (${results.typeCheck.issues} issues)`)
        }

        if (results.lint) {
          const status = results.lint.passed ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m'
          console.log(`Lint:       ${status} (${results.lint.errors} errors, ${results.lint.warnings} warnings)`)
        }

        if (results.tests) {
          const status = results.tests.passed ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m'
          const passed = results.tests.total - results.tests.failed
          console.log(`Tests:      ${status} (${passed}/${results.tests.total} passed)`)
        }

        if (results.coverage) {
          const thresholds = config.testing.coverageThreshold
          const lineStatus = results.coverage.lines >= (thresholds?.lines || 0) ? '\x1b[32m' : '\x1b[33m'
          const branchStatus = results.coverage.branches >= (thresholds?.branches || 0) ? '\x1b[32m' : '\x1b[33m'
          const funcStatus = results.coverage.functions >= (thresholds?.functions || 0) ? '\x1b[32m' : '\x1b[33m'

          console.log('\nCoverage:')
          console.log(`  Lines:     ${lineStatus}${results.coverage.lines}%\x1b[0m (threshold: ${thresholds?.lines || 0}%)`)
          console.log(`  Branches:  ${branchStatus}${results.coverage.branches}%\x1b[0m (threshold: ${thresholds?.branches || 0}%)`)
          console.log(`  Functions: ${funcStatus}${results.coverage.functions}%\x1b[0m (threshold: ${thresholds?.functions || 0}%)`)
        }

        console.log('='.repeat(50))

        // Determine overall status
        const allPassed =
          (results.typeCheck?.passed ?? true) &&
          (results.lint?.passed ?? true) &&
          (results.tests?.passed ?? true)

        if (allPassed) {
          console.log('\x1b[32mAll QA checks passed!\x1b[0m\n')
        } else {
          console.log('\x1b[31mSome QA checks failed.\x1b[0m\n')
          if (options.preCommit) {
            process.exit(1)
          }
        }
      } catch (error) {
        spinner.fail('Error')
        console.error(
          'Failed to run QA command:',
          error instanceof Error ? error.message : error
        )
        process.exit(1)
      }
    })
}
