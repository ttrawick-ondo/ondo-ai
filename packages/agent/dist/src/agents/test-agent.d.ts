import type { AgentContext, AgentResult, AgentMetadata, ExecutionPlan, ValidationResult } from '../types/index.js';
import { AbstractAgent } from './base.js';
export declare class TestAgent extends AbstractAgent {
    readonly metadata: AgentMetadata;
    execute(context: AgentContext): Promise<AgentResult>;
    planExecution(context: AgentContext): Promise<ExecutionPlan>;
    validateResult(result: AgentResult): Promise<ValidationResult>;
    protected buildSystemPrompt(context: AgentContext): string;
    protected buildInitialPrompt(context: AgentContext): string;
}
//# sourceMappingURL=test-agent.d.ts.map