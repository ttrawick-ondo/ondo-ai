import { z } from 'zod';
export type JSONSchemaType = 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object' | 'null';
export interface JSONSchema {
    type: JSONSchemaType | JSONSchemaType[];
    description?: string;
    properties?: Record<string, JSONSchema>;
    required?: string[];
    items?: JSONSchema;
    enum?: (string | number | boolean | null)[];
    default?: unknown;
    minimum?: number;
    maximum?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    additionalProperties?: boolean | JSONSchema;
}
export interface ToolDefinition {
    name: string;
    description: string;
    inputSchema: JSONSchema;
    requiresApproval?: boolean;
    category?: ToolCategory;
}
export type ToolCategory = 'file' | 'test' | 'lint' | 'git' | 'analysis' | 'shell' | 'search';
export interface ToolResult {
    success: boolean;
    output: string;
    error?: string;
    metadata?: Record<string, unknown>;
}
export interface Tool extends ToolDefinition {
    execute(input: unknown): Promise<ToolResult>;
    validate?(input: unknown): {
        valid: boolean;
        errors?: string[];
    };
}
export interface ToolRegistry {
    register(tool: Tool): void;
    unregister(name: string): void;
    get(name: string): Tool | undefined;
    getAll(): Tool[];
    getByCategory(category: ToolCategory): Tool[];
    has(name: string): boolean;
}
export interface ToolExecutionContext {
    workingDirectory: string;
    dryRun: boolean;
    verbose: boolean;
    timeout: number;
}
export interface ToolCallRequest {
    name: string;
    input: unknown;
    context: ToolExecutionContext;
}
export interface ToolCallResult {
    request: ToolCallRequest;
    result: ToolResult;
    duration: number;
    timestamp: number;
}
export declare const FilePathInputSchema: z.ZodObject<{
    path: z.ZodString;
}, "strip", z.ZodTypeAny, {
    path: string;
}, {
    path: string;
}>;
export declare const FileContentInputSchema: z.ZodObject<{
    path: z.ZodString;
    content: z.ZodString;
}, "strip", z.ZodTypeAny, {
    path: string;
    content: string;
}, {
    path: string;
    content: string;
}>;
export declare const GlobPatternInputSchema: z.ZodObject<{
    pattern: z.ZodString;
    cwd: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    pattern: string;
    cwd?: string | undefined;
}, {
    pattern: string;
    cwd?: string | undefined;
}>;
export declare const CommandInputSchema: z.ZodObject<{
    command: z.ZodString;
    args: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    cwd: z.ZodOptional<z.ZodString>;
    timeout: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    command: string;
    cwd?: string | undefined;
    args?: string[] | undefined;
    timeout?: number | undefined;
}, {
    command: string;
    cwd?: string | undefined;
    args?: string[] | undefined;
    timeout?: number | undefined;
}>;
export type FilePathInput = z.infer<typeof FilePathInputSchema>;
export type FileContentInput = z.infer<typeof FileContentInputSchema>;
export type GlobPatternInput = z.infer<typeof GlobPatternInputSchema>;
export type CommandInput = z.infer<typeof CommandInputSchema>;
//# sourceMappingURL=tool.d.ts.map