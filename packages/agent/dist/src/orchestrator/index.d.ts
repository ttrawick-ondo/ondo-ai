import type { AgentConfig, AgentResult, CreateTaskInput, Task, AgentEventHandler } from '../types/index.js';
import { TaskQueue } from './task-queue.js';
import { ApprovalGate, type ApprovalHandler } from './approval-gate.js';
import { Scheduler } from './scheduler.js';
import type { ToolRegistry } from '../types/index.js';
export interface OrchestratorOptions {
    config: AgentConfig;
    workingDirectory: string;
    apiKey?: string;
}
export interface OrchestratorEvents {
    onTaskStarted?: (task: Task) => void;
    onTaskCompleted?: (task: Task, result: AgentResult) => void;
    onTaskFailed?: (task: Task, error: string) => void;
    onApprovalRequired?: (task: Task) => void;
    onAgentEvent?: AgentEventHandler;
}
export declare class Orchestrator {
    private config;
    private workingDirectory;
    private apiKey?;
    private taskQueue;
    private approvalGate;
    private scheduler;
    private toolRegistry;
    private agents;
    private eventHandlers;
    private isRunning;
    private abortController;
    constructor(options: OrchestratorOptions);
    private initializeAgents;
    setEventHandlers(handlers: OrchestratorEvents): void;
    setApprovalHandler(handler: ApprovalHandler): void;
    createTask(input: CreateTaskInput): Task;
    runTask(taskId: string): Promise<AgentResult>;
    runQueue(): Promise<void>;
    stop(): void;
    getTaskQueue(): TaskQueue;
    getScheduler(): Scheduler;
    getApprovalGate(): ApprovalGate;
    getToolRegistry(): ToolRegistry;
    getConfig(): AgentConfig;
    private createContext;
    private handleAgentEvent;
    private sleep;
}
export { TaskQueue } from './task-queue.js';
export { ApprovalGate, createInteractiveApprovalHandler, createAutoApproveHandler, createAutoRejectHandler } from './approval-gate.js';
export type { ApprovalRequest, ApprovalDecision, ApprovalHandler } from './approval-gate.js';
export { Scheduler } from './scheduler.js';
export type { ScheduleOptions, ScheduledTask } from './scheduler.js';
//# sourceMappingURL=index.d.ts.map