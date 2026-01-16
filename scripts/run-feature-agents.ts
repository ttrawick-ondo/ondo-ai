#!/usr/bin/env npx ts-node

/**
 * Feature Agent Runner
 *
 * Runs the ondo-agent system to implement high-value features autonomously.
 * Uses auto-approval mode for demonstration/testing.
 */

import * as fs from 'node:fs/promises'
import * as path from 'node:path'

const FEATURES_DIR = path.join(process.cwd(), 'features')

interface FeatureSpec {
  name: string
  file: string
  priority: number
  description: string
}

const FEATURES: FeatureSpec[] = [
  {
    name: 'OpenAI Function Calling',
    file: '01-openai-function-calling.md',
    priority: 1,
    description: 'Implement tool/function calling for OpenAI provider',
  },
  {
    name: 'Vision/Image Upload',
    file: '02-vision-image-upload.md',
    priority: 2,
    description: 'Enable image upload and vision capabilities',
  },
  {
    name: 'Glean Agent Testing',
    file: '03-glean-agent-testing.md',
    priority: 3,
    description: 'Add agent preview/testing before creation',
  },
  {
    name: 'Glean Citation Viewer',
    file: '04-glean-citation-viewer.md',
    priority: 4,
    description: 'Rich citation display for Glean responses',
  },
  {
    name: 'File Attachments',
    file: '05-file-attachments.md',
    priority: 5,
    description: 'Support file uploads in conversations',
  },
]

async function loadFeatureSpec(file: string): Promise<string> {
  const filePath = path.join(FEATURES_DIR, file)
  return fs.readFile(filePath, 'utf-8')
}

async function runFeatureAgent(feature: FeatureSpec): Promise<void> {
  const spec = await loadFeatureSpec(feature.file)

  console.log(`\n${'='.repeat(60)}`)
  console.log(`Starting: ${feature.name}`)
  console.log(`Priority: ${feature.priority}`)
  console.log(`${'='.repeat(60)}\n`)

  // Use the CLI to run the feature agent
  const { spawn } = await import('node:child_process')

  return new Promise((resolve, reject) => {
    const proc = spawn('node', [
      'packages/agent/dist/bin/ondo-agent.js',
      'feature',
      '--spec', spec,
      '--verbose',
    ], {
      cwd: process.cwd(),
      stdio: 'inherit',
      env: {
        ...process.env,
        // Auto-approve for autonomous execution (in real usage, remove this)
        ONDO_AGENT_AUTO_APPROVE: 'true',
      },
    })

    proc.on('close', (code) => {
      if (code === 0) {
        console.log(`\n✅ Completed: ${feature.name}\n`)
        resolve()
      } else {
        console.error(`\n❌ Failed: ${feature.name} (exit code: ${code})\n`)
        reject(new Error(`Feature agent failed with code ${code}`))
      }
    })

    proc.on('error', (err) => {
      console.error(`\n❌ Error: ${feature.name}:`, err.message)
      reject(err)
    })
  })
}

async function main(): Promise<void> {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║           ONDO-AI Feature Agent Runner                       ║
║                                                              ║
║  Running autonomous agents to implement high-value features  ║
╚══════════════════════════════════════════════════════════════╝
`)

  // Check for API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ Error: ANTHROPIC_API_KEY environment variable not set')
    console.log('\nPlease set your API key:')
    console.log('  export ANTHROPIC_API_KEY=your-key-here\n')
    process.exit(1)
  }

  // Parse arguments
  const args = process.argv.slice(2)
  const runAll = args.includes('--all')
  const featureArg = args.find(a => a.startsWith('--feature='))
  const selectedFeature = featureArg ? parseInt(featureArg.split('=')[1]) : null

  let featuresToRun = FEATURES

  if (selectedFeature !== null) {
    featuresToRun = FEATURES.filter(f => f.priority === selectedFeature)
    if (featuresToRun.length === 0) {
      console.error(`❌ Feature ${selectedFeature} not found`)
      console.log('\nAvailable features:')
      FEATURES.forEach(f => console.log(`  ${f.priority}. ${f.name}`))
      process.exit(1)
    }
  } else if (!runAll) {
    console.log('Available features to implement:\n')
    FEATURES.forEach(f => {
      console.log(`  ${f.priority}. ${f.name}`)
      console.log(`     ${f.description}\n`)
    })
    console.log('\nUsage:')
    console.log('  npx ts-node scripts/run-feature-agents.ts --all')
    console.log('  npx ts-node scripts/run-feature-agents.ts --feature=1')
    console.log('')
    return
  }

  console.log(`\n📋 Features to implement: ${featuresToRun.length}\n`)
  featuresToRun.forEach(f => console.log(`  • ${f.name}`))
  console.log('')

  // Run features sequentially
  for (const feature of featuresToRun) {
    try {
      await runFeatureAgent(feature)
    } catch (error) {
      console.error(`\nStopping due to error in ${feature.name}`)
      if (!args.includes('--continue-on-error')) {
        process.exit(1)
      }
    }
  }

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    All features complete!                    ║
╚══════════════════════════════════════════════════════════════╝
`)
}

main().catch(console.error)
