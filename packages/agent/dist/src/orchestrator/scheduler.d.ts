import type { Task, TaskPriority, AgentRole } from '../types/index.js';
export interface ScheduleOptions {
    maxConcurrent: number;
    priorityWeights: Record<TaskPriority, number>;
    typeWeights: Record<AgentRole, number>;
    cooldownMs: number;
}
export interface ScheduledTask {
    task: Task;
    scheduledAt: number;
    estimatedStart: number;
    priority: number;
}
export declare class Scheduler {
    private options;
    private scheduledTasks;
    private runningTasks;
    private lastRunTime;
    constructor(options?: Partial<ScheduleOptions>);
    schedule(task: Task): ScheduledTask;
    unschedule(taskId: string): boolean;
    getNext(): ScheduledTask | undefined;
    markRunning(taskId: string): void;
    markComplete(taskId: string, type: AgentRole): void;
    isInCooldown(type: AgentRole): boolean;
    canRunMore(): boolean;
    getScheduled(): ScheduledTask[];
    getRunningCount(): number;
    clear(): void;
    reprioritize(): void;
    private calculatePriority;
    private estimateStartTime;
    updateOptions(options: Partial<ScheduleOptions>): void;
}
//# sourceMappingURL=scheduler.d.ts.map