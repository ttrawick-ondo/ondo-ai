import Anthropic from '@anthropic-ai/sdk';
export class AbstractAgent {
    client;
    eventHandlers = [];
    constructor(apiKey) {
        this.client = new Anthropic({
            apiKey: apiKey ?? process.env.ANTHROPIC_API_KEY,
        });
    }
    onEvent(handler) {
        this.eventHandlers.push(handler);
    }
    async emit(event) {
        for (const handler of this.eventHandlers) {
            await handler(event);
        }
    }
    async runAgentLoop(context) {
        const toolsUsed = [];
        const changes = [];
        let iterations = 0;
        await this.emit({
            type: 'started',
            timestamp: Date.now(),
            data: { message: `Starting ${this.metadata.name}` },
        });
        const systemPrompt = this.buildSystemPrompt(context);
        const messages = [
            { role: 'user', content: this.buildInitialPrompt(context) },
        ];
        const tools = this.buildToolDefinitions(context.tools);
        try {
            while (iterations < context.maxIterations) {
                iterations++;
                await this.emit({
                    type: 'iteration_start',
                    timestamp: Date.now(),
                    data: { iteration: iterations },
                });
                const response = await this.client.messages.create({
                    model: context.config.defaults.model,
                    max_tokens: context.config.defaults.maxTokens,
                    temperature: context.config.defaults.temperature,
                    system: systemPrompt,
                    messages,
                    tools,
                });
                // Process response
                const assistantContent = [];
                let hasToolUse = false;
                const toolResults = [];
                for (const block of response.content) {
                    assistantContent.push(block);
                    if (block.type === 'tool_use') {
                        hasToolUse = true;
                        const tool = context.tools.get(block.name);
                        if (tool) {
                            await this.emit({
                                type: 'tool_call',
                                timestamp: Date.now(),
                                data: { toolName: block.name, toolInput: block.input },
                            });
                            const result = await this.executeTool(tool, block.input, context);
                            const toolRecord = {
                                toolName: block.name,
                                input: block.input,
                                result,
                                timestamp: Date.now(),
                            };
                            toolsUsed.push(toolRecord);
                            // Track file changes
                            if (this.isFileModifyingTool(block.name)) {
                                const change = this.extractFileChange(block.name, block.input, result);
                                if (change)
                                    changes.push(change);
                            }
                            await this.emit({
                                type: 'tool_result',
                                timestamp: Date.now(),
                                data: { toolName: block.name, toolResult: result },
                            });
                            toolResults.push({
                                type: 'tool_result',
                                tool_use_id: block.id,
                                content: result.success ? result.output : `Error: ${result.error}`,
                            });
                        }
                        else {
                            toolResults.push({
                                type: 'tool_result',
                                tool_use_id: block.id,
                                content: `Error: Unknown tool "${block.name}"`,
                                is_error: true,
                            });
                        }
                    }
                    else if (block.type === 'text') {
                        await this.emit({
                            type: 'thinking',
                            timestamp: Date.now(),
                            data: { message: block.text },
                        });
                    }
                }
                messages.push({ role: 'assistant', content: assistantContent });
                if (hasToolUse) {
                    messages.push({ role: 'user', content: toolResults });
                }
                // Check if agent is done
                if (response.stop_reason === 'end_turn' && !hasToolUse) {
                    const textContent = response.content.find((b) => b.type === 'text');
                    const summary = textContent && 'text' in textContent ? textContent.text : 'Task completed';
                    const result = {
                        success: true,
                        summary,
                        changes,
                        toolsUsed,
                        iterations,
                    };
                    await this.emit({
                        type: 'completed',
                        timestamp: Date.now(),
                        data: { result },
                    });
                    return result;
                }
            }
            // Max iterations reached
            const result = {
                success: false,
                summary: 'Maximum iterations reached without completion',
                changes,
                toolsUsed,
                iterations,
                error: `Exceeded max iterations (${context.maxIterations})`,
            };
            await this.emit({
                type: 'failed',
                timestamp: Date.now(),
                data: { result, error: result.error },
            });
            return result;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const result = {
                success: false,
                summary: `Agent failed: ${errorMessage}`,
                changes,
                toolsUsed,
                iterations,
                error: errorMessage,
            };
            await this.emit({
                type: 'failed',
                timestamp: Date.now(),
                data: { result, error: errorMessage },
            });
            return result;
        }
    }
    buildToolDefinitions(tools) {
        return Array.from(tools.values()).map((tool) => ({
            name: tool.name,
            description: tool.description,
            input_schema: tool.inputSchema,
        }));
    }
    async executeTool(tool, input, _context) {
        try {
            if (tool.validate) {
                const validation = tool.validate(input);
                if (!validation.valid) {
                    return {
                        success: false,
                        output: '',
                        error: `Validation failed: ${validation.errors?.join(', ')}`,
                    };
                }
            }
            return await tool.execute(input);
        }
        catch (error) {
            return {
                success: false,
                output: '',
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
    isFileModifyingTool(toolName) {
        return ['writeFile', 'editFile', 'deleteFile', 'createFile'].includes(toolName);
    }
    extractFileChange(toolName, input, result) {
        if (!result.success)
            return null;
        const path = input.path;
        if (!path)
            return null;
        switch (toolName) {
            case 'writeFile':
            case 'createFile':
                return { path, type: 'created' };
            case 'editFile':
                return { path, type: 'modified' };
            case 'deleteFile':
                return { path, type: 'deleted' };
            default:
                return null;
        }
    }
    generateId() {
        return `${this.metadata.role}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }
}
//# sourceMappingURL=base.js.map