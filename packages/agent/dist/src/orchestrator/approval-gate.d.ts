import type { Task, AutonomyLevel, AgentRole, ExecutionPlan } from '../types/index.js';
export interface ApprovalRequest {
    id: string;
    task: Task;
    plan: ExecutionPlan;
    summary: string;
    risks: string[];
    timestamp: number;
}
export interface ApprovalDecision {
    requestId: string;
    approved: boolean;
    reason?: string;
    modifiedPlan?: ExecutionPlan;
    timestamp: number;
}
export type ApprovalHandler = (request: ApprovalRequest) => Promise<ApprovalDecision>;
export declare class ApprovalGate {
    private pendingApprovals;
    private approvalHandler;
    private autoApprovalCount;
    private maxAutoApprovals;
    constructor(maxAutoApprovals?: number);
    setApprovalHandler(handler: ApprovalHandler): void;
    requestApproval(task: Task, plan: ExecutionPlan): Promise<ApprovalDecision>;
    requiresApproval(task: Task, plan: ExecutionPlan): boolean;
    shouldAutoApprove(task: Task): boolean;
    getAutonomyLevel(role: AgentRole, autonomyConfig: Record<AgentRole, AutonomyLevel>): AutonomyLevel;
    getPendingApprovals(): ApprovalRequest[];
    getPendingApproval(id: string): ApprovalRequest | undefined;
    cancelApproval(id: string): boolean;
    resetAutoApprovalCount(): void;
    getAutoApprovalCount(): number;
    private generateId;
    private generateSummary;
}
export declare function createInteractiveApprovalHandler(promptFn: (message: string, options: string[]) => Promise<string>): ApprovalHandler;
export declare function createAutoApproveHandler(): ApprovalHandler;
export declare function createAutoRejectHandler(reason?: string): ApprovalHandler;
//# sourceMappingURL=approval-gate.d.ts.map