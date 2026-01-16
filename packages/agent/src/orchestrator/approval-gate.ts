import type {
  Task,
  AutonomyLevel,
  AgentRole,
  ExecutionPlan,
} from '../types/index.js'

export interface ApprovalRequest {
  id: string
  task: Task
  plan: ExecutionPlan
  summary: string
  risks: string[]
  timestamp: number
}

export interface ApprovalDecision {
  requestId: string
  approved: boolean
  reason?: string
  modifiedPlan?: ExecutionPlan
  timestamp: number
}

export type ApprovalHandler = (request: ApprovalRequest) => Promise<ApprovalDecision>

export class ApprovalGate {
  private pendingApprovals: Map<string, ApprovalRequest> = new Map()
  private approvalHandler: ApprovalHandler | null = null
  private autoApprovalCount = 0
  private maxAutoApprovals: number

  constructor(maxAutoApprovals = 10) {
    this.maxAutoApprovals = maxAutoApprovals
  }

  setApprovalHandler(handler: ApprovalHandler): void {
    this.approvalHandler = handler
  }

  async requestApproval(
    task: Task,
    plan: ExecutionPlan
  ): Promise<ApprovalDecision> {
    // Check if task requires approval based on autonomy level
    if (!this.requiresApproval(task, plan)) {
      this.autoApprovalCount++
      return {
        requestId: this.generateId(),
        approved: true,
        reason: 'Auto-approved based on autonomy level',
        timestamp: Date.now(),
      }
    }

    // Create approval request
    const request: ApprovalRequest = {
      id: this.generateId(),
      task,
      plan,
      summary: this.generateSummary(task, plan),
      risks: plan.risks,
      timestamp: Date.now(),
    }

    this.pendingApprovals.set(request.id, request)

    // If no handler is set, auto-reject
    if (!this.approvalHandler) {
      const decision: ApprovalDecision = {
        requestId: request.id,
        approved: false,
        reason: 'No approval handler configured',
        timestamp: Date.now(),
      }
      this.pendingApprovals.delete(request.id)
      return decision
    }

    // Request approval from handler
    const decision = await this.approvalHandler(request)
    this.pendingApprovals.delete(request.id)

    return decision
  }

  requiresApproval(task: Task, plan: ExecutionPlan): boolean {
    // Check if plan explicitly requires approval
    if (plan.requiresApproval) {
      return true
    }

    // Check autonomy level
    switch (task.autonomyLevel) {
      case 'full':
        return false
      case 'supervised':
        return true
      case 'manual':
        return true
      default:
        return true
    }
  }

  shouldAutoApprove(task: Task): boolean {
    if (task.autonomyLevel !== 'full') {
      return false
    }

    // Check if we've exceeded max auto approvals
    if (this.autoApprovalCount >= this.maxAutoApprovals) {
      return false
    }

    return true
  }

  getAutonomyLevel(role: AgentRole, autonomyConfig: Record<AgentRole, AutonomyLevel>): AutonomyLevel {
    return autonomyConfig[role] || 'supervised'
  }

  getPendingApprovals(): ApprovalRequest[] {
    return Array.from(this.pendingApprovals.values())
  }

  getPendingApproval(id: string): ApprovalRequest | undefined {
    return this.pendingApprovals.get(id)
  }

  cancelApproval(id: string): boolean {
    return this.pendingApprovals.delete(id)
  }

  resetAutoApprovalCount(): void {
    this.autoApprovalCount = 0
  }

  getAutoApprovalCount(): number {
    return this.autoApprovalCount
  }

  private generateId(): string {
    return `approval-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  }

  private generateSummary(task: Task, plan: ExecutionPlan): string {
    const lines = [
      `Task: ${task.title}`,
      `Type: ${task.type}`,
      `Description: ${task.description}`,
      '',
      'Execution Plan:',
      ...plan.steps.map((s, i) => `  ${i + 1}. ${s.description}`),
      '',
      `Estimated tool calls: ${plan.estimatedToolCalls}`,
    ]

    if (plan.risks.length > 0) {
      lines.push('', 'Risks:')
      lines.push(...plan.risks.map((r) => `  - ${r}`))
    }

    return lines.join('\n')
  }
}

// Interactive approval handler for CLI
export function createInteractiveApprovalHandler(
  promptFn: (message: string, options: string[]) => Promise<string>
): ApprovalHandler {
  return async (request: ApprovalRequest): Promise<ApprovalDecision> => {
    console.log('\n' + '='.repeat(60))
    console.log('APPROVAL REQUIRED')
    console.log('='.repeat(60))
    console.log(request.summary)
    console.log('='.repeat(60) + '\n')

    const response = await promptFn('Do you want to proceed?', ['yes', 'no', 'modify'])

    if (response === 'yes') {
      return {
        requestId: request.id,
        approved: true,
        timestamp: Date.now(),
      }
    }

    if (response === 'modify') {
      // In a real implementation, this would allow modifying the plan
      return {
        requestId: request.id,
        approved: true,
        reason: 'Plan modified by user',
        modifiedPlan: request.plan,
        timestamp: Date.now(),
      }
    }

    return {
      requestId: request.id,
      approved: false,
      reason: 'Rejected by user',
      timestamp: Date.now(),
    }
  }
}

// Auto-approve handler for testing
export function createAutoApproveHandler(): ApprovalHandler {
  return async (request: ApprovalRequest): Promise<ApprovalDecision> => {
    return {
      requestId: request.id,
      approved: true,
      reason: 'Auto-approved for testing',
      timestamp: Date.now(),
    }
  }
}

// Auto-reject handler
export function createAutoRejectHandler(reason = 'Auto-rejected'): ApprovalHandler {
  return async (request: ApprovalRequest): Promise<ApprovalDecision> => {
    return {
      requestId: request.id,
      approved: false,
      reason,
      timestamp: Date.now(),
    }
  }
}
