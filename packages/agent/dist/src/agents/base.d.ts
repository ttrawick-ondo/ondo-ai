import Anthropic from '@anthropic-ai/sdk';
import type { AgentContext, AgentResult, AgentMetadata, BaseAgent, ExecutionPlan, ValidationResult, AgentEvent, AgentEventHandler, FileChange, Tool, ToolResult } from '../types/index.js';
export declare abstract class AbstractAgent implements BaseAgent {
    abstract readonly metadata: AgentMetadata;
    protected client: Anthropic;
    protected eventHandlers: AgentEventHandler[];
    constructor(apiKey?: string);
    onEvent(handler: AgentEventHandler): void;
    protected emit(event: AgentEvent): Promise<void>;
    abstract execute(context: AgentContext): Promise<AgentResult>;
    abstract planExecution(context: AgentContext): Promise<ExecutionPlan>;
    abstract validateResult(result: AgentResult): Promise<ValidationResult>;
    protected runAgentLoop(context: AgentContext): Promise<AgentResult>;
    protected abstract buildSystemPrompt(context: AgentContext): string;
    protected abstract buildInitialPrompt(context: AgentContext): string;
    protected buildToolDefinitions(tools: Map<string, Tool>): Anthropic.Tool[];
    protected executeTool(tool: Tool, input: unknown, _context: AgentContext): Promise<ToolResult>;
    protected isFileModifyingTool(toolName: string): boolean;
    protected extractFileChange(toolName: string, input: Record<string, unknown>, result: ToolResult): FileChange | null;
    protected generateId(): string;
}
//# sourceMappingURL=base.d.ts.map