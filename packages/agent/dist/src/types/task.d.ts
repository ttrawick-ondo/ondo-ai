import type { AgentRole, AutonomyLevel } from './config.js';
import type { AgentResult } from './agent.js';
export type TaskStatus = 'pending' | 'queued' | 'running' | 'awaiting_approval' | 'approved' | 'completed' | 'failed' | 'cancelled';
export type TaskPriority = 'low' | 'normal' | 'high' | 'critical';
export interface Task {
    id: string;
    type: AgentRole;
    status: TaskStatus;
    priority: TaskPriority;
    autonomyLevel: AutonomyLevel;
    title: string;
    description: string;
    target?: TaskTarget;
    options: TaskOptions;
    createdAt: number;
    startedAt?: number;
    completedAt?: number;
    result?: TaskResult;
    parentTaskId?: string;
    childTaskIds: string[];
    retryCount: number;
    maxRetries: number;
}
export interface TaskTarget {
    files?: string[];
    directories?: string[];
    pattern?: string;
    scope?: 'file' | 'directory' | 'project';
}
export interface TaskOptions {
    dryRun?: boolean;
    verbose?: boolean;
    interactive?: boolean;
    autoFix?: boolean;
    coverageTarget?: number;
    testFilter?: string;
    featureSpec?: string;
    refactorType?: RefactorType;
    docType?: 'readme' | 'api' | 'changelog' | 'architecture' | 'all';
    outputPath?: string;
    includeExamples?: boolean;
    format?: string;
    scanType?: 'full' | 'dependencies' | 'secrets' | 'sast';
    reportPath?: string;
    severityThreshold?: string;
    enableCommit?: boolean;
}
export type RefactorType = 'extract-function' | 'extract-component' | 'rename' | 'move' | 'simplify' | 'optimize' | 'modernize';
export interface TaskResult {
    success: boolean;
    summary: string;
    output: string;
    agentResult?: AgentResult;
    metrics?: TaskMetrics;
    artifacts?: TaskArtifact[];
}
export interface TaskMetrics {
    duration: number;
    iterationsUsed: number;
    toolCallCount: number;
    tokensUsed?: number;
    filesModified: number;
    testsGenerated?: number;
    testsPassed?: number;
    testsFailed?: number;
    coverageBefore?: number;
    coverageAfter?: number;
}
export interface TaskArtifact {
    type: 'file' | 'log' | 'report' | 'diff';
    name: string;
    path: string;
    content?: string;
}
export interface TaskQueueState {
    pending: Task[];
    running: Task | null;
    completed: Task[];
    failed: Task[];
}
export interface TaskFilter {
    status?: TaskStatus[];
    type?: AgentRole[];
    priority?: TaskPriority[];
    since?: number;
    until?: number;
}
export interface CreateTaskInput {
    type: AgentRole;
    title: string;
    description: string;
    target?: TaskTarget;
    options?: TaskOptions;
    priority?: TaskPriority;
    parentTaskId?: string;
}
//# sourceMappingURL=task.d.ts.map