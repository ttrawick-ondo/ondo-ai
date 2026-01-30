import type {
  AgentConfig,
  AgentContext,
  AgentResult,
  AgentRole,
  AutonomyLevel,
  BaseAgent,
  CreateTaskInput,
  Task,
  Tool,
  AgentEvent,
  AgentEventHandler,
} from '../types/index.js'
import { TaskQueue } from './task-queue.js'
import { ApprovalGate, type ApprovalHandler } from './approval-gate.js'
import { Scheduler } from './scheduler.js'
import { TestAgent } from '../agents/test-agent.js'
import { QAAgent } from '../agents/qa-agent.js'
import { FeatureAgent } from '../agents/feature-agent.js'
import { RefactorAgent } from '../agents/refactor-agent.js'
import { DocsAgent } from '../agents/docs-agent.js'
import { SecurityAgent } from '../agents/security-agent.js'
import { createToolRegistry, registerAllTools } from '../tools/index.js'
import type { ToolRegistry } from '../types/index.js'

export interface OrchestratorOptions {
  config: AgentConfig
  workingDirectory: string
  apiKey?: string
}

export interface OrchestratorEvents {
  onTaskStarted?: (task: Task) => void
  onTaskCompleted?: (task: Task, result: AgentResult) => void
  onTaskFailed?: (task: Task, error: string) => void
  onApprovalRequired?: (task: Task) => void
  onAgentEvent?: AgentEventHandler
}

export class Orchestrator {
  private config: AgentConfig
  private workingDirectory: string
  private apiKey?: string

  private taskQueue: TaskQueue
  private approvalGate: ApprovalGate
  private scheduler: Scheduler
  private toolRegistry: ToolRegistry

  private agents: Map<string, BaseAgent> = new Map()
  private eventHandlers: OrchestratorEvents = {}
  private isRunning = false
  private abortController: AbortController | null = null

  constructor(options: OrchestratorOptions) {
    this.config = options.config
    this.workingDirectory = options.workingDirectory
    this.apiKey = options.apiKey

    // Initialize components with default autonomy levels
    const defaultAutonomy: Record<AgentRole, AutonomyLevel> = {
      test: 'full',
      qa: 'full',
      feature: 'supervised',
      refactor: 'supervised',
      docs: 'supervised',
      security: 'supervised',
    }
    const taskTypes = { ...defaultAutonomy, ...this.config.autonomy.taskTypes }
    this.taskQueue = new TaskQueue(taskTypes)
    this.approvalGate = new ApprovalGate(this.config.autonomy.maxAutoApprovals)
    this.scheduler = new Scheduler()
    this.toolRegistry = createToolRegistry()

    // Register tools
    registerAllTools(this.toolRegistry, this.workingDirectory)

    // Initialize agents
    this.initializeAgents()
  }

  private initializeAgents(): void {
    const testAgent = new TestAgent(this.apiKey)
    const qaAgent = new QAAgent(this.apiKey)
    const featureAgent = new FeatureAgent(this.apiKey)
    const refactorAgent = new RefactorAgent(this.apiKey)
    const docsAgent = new DocsAgent(this.apiKey)
    const securityAgent = new SecurityAgent(this.apiKey)

    // Set up event handlers for each agent
    const agents = [testAgent, qaAgent, featureAgent, refactorAgent, docsAgent, securityAgent]
    for (const agent of agents) {
      agent.onEvent((event) => this.handleAgentEvent(event))
      this.agents.set(agent.metadata.role, agent)
    }
  }

  setEventHandlers(handlers: OrchestratorEvents): void {
    this.eventHandlers = { ...this.eventHandlers, ...handlers }
  }

  setApprovalHandler(handler: ApprovalHandler): void {
    this.approvalGate.setApprovalHandler(handler)
  }

  createTask(input: CreateTaskInput): Task {
    const task = this.taskQueue.create(input)
    this.scheduler.schedule(task)
    return task
  }

  async runTask(taskId: string): Promise<AgentResult> {
    const task = this.taskQueue.get(taskId)
    if (!task) {
      throw new Error(`Task ${taskId} not found`)
    }

    const agent = this.agents.get(task.type)
    if (!agent) {
      throw new Error(`No agent found for task type: ${task.type}`)
    }

    // Create agent context
    const context = this.createContext(task)

    // Get execution plan
    const plan = await agent.planExecution(context)

    // Request approval if needed
    if (this.approvalGate.requiresApproval(task, plan)) {
      this.taskQueue.updateStatus(task.id, 'awaiting_approval')
      this.eventHandlers.onApprovalRequired?.(task)

      const decision = await this.approvalGate.requestApproval(task, plan)

      if (!decision.approved) {
        this.taskQueue.updateStatus(task.id, 'cancelled')
        return {
          success: false,
          summary: `Task cancelled: ${decision.reason}`,
          changes: [],
          toolsUsed: [],
          iterations: 0,
          error: decision.reason,
        }
      }
    }

    // Run the task
    this.taskQueue.updateStatus(task.id, 'running')
    this.scheduler.markRunning(task.id)
    this.eventHandlers.onTaskStarted?.(task)

    try {
      const result = await agent.execute(context)

      // Update task with result
      this.taskQueue.update(task.id, {
        result: {
          success: result.success,
          summary: result.summary,
          output: result.summary,
          agentResult: result,
          metrics: {
            duration: Date.now() - (task.startedAt || Date.now()),
            iterationsUsed: result.iterations,
            toolCallCount: result.toolsUsed.length,
            filesModified: result.changes.length,
          },
        },
      })

      if (result.success) {
        this.taskQueue.updateStatus(task.id, 'completed')
        this.eventHandlers.onTaskCompleted?.(task, result)
      } else {
        this.taskQueue.updateStatus(task.id, 'failed')
        this.eventHandlers.onTaskFailed?.(task, result.error || 'Unknown error')
      }

      this.scheduler.markComplete(task.id, task.type)
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.taskQueue.updateStatus(task.id, 'failed')
      this.scheduler.markComplete(task.id, task.type)
      this.eventHandlers.onTaskFailed?.(task, errorMessage)

      return {
        success: false,
        summary: `Task failed: ${errorMessage}`,
        changes: [],
        toolsUsed: [],
        iterations: 0,
        error: errorMessage,
      }
    }
  }

  async runQueue(): Promise<void> {
    this.isRunning = true
    this.abortController = new AbortController()

    while (this.isRunning) {
      const scheduled = this.scheduler.getNext()
      if (!scheduled) {
        // No more tasks or waiting for cooldown
        await this.sleep(100)
        continue
      }

      try {
        await this.runTask(scheduled.task.id)
      } catch (error) {
        console.error(`Error running task ${scheduled.task.id}:`, error)
      }

      // Check if there are more pending tasks
      const pending = this.taskQueue.getByStatus('pending')
      if (pending.length === 0) {
        break
      }
    }

    this.isRunning = false
    this.abortController = null
  }

  stop(): void {
    this.isRunning = false
    this.abortController?.abort()
  }

  getTaskQueue(): TaskQueue {
    return this.taskQueue
  }

  getScheduler(): Scheduler {
    return this.scheduler
  }

  getApprovalGate(): ApprovalGate {
    return this.approvalGate
  }

  getToolRegistry(): ToolRegistry {
    return this.toolRegistry
  }

  getConfig(): AgentConfig {
    return this.config
  }

  private createContext(task: Task): AgentContext {
    const agent = this.agents.get(task.type)
    const toolsMap = new Map<string, Tool>()

    // Filter tools based on agent capabilities
    for (const tool of this.toolRegistry.getAll()) {
      // Check if agent can use git commit tools
      if (tool.category === 'git' && tool.name === 'gitCommit') {
        // Only include gitCommit if agent has canCommit capability
        // AND if commit is enabled for this task
        if (agent?.metadata.capabilities.canCommit && task.options?.enableCommit) {
          toolsMap.set(tool.name, tool)
        }
        continue
      }

      // Include all other tools
      toolsMap.set(tool.name, tool)
    }

    return {
      config: this.config,
      task,
      tools: toolsMap,
      workingDirectory: this.workingDirectory,
      conversationHistory: [],
      iteration: 0,
      maxIterations: this.config.defaults.maxIterations,
    }
  }

  private handleAgentEvent(event: AgentEvent): void {
    this.eventHandlers.onAgentEvent?.(event)
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

// Re-export components
export { TaskQueue } from './task-queue.js'
export { ApprovalGate, createInteractiveApprovalHandler, createAutoApproveHandler, createAutoRejectHandler } from './approval-gate.js'
export type { ApprovalRequest, ApprovalDecision, ApprovalHandler } from './approval-gate.js'
export { Scheduler } from './scheduler.js'
export type { ScheduleOptions, ScheduledTask } from './scheduler.js'
