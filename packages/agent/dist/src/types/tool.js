import { z } from 'zod';
// Common tool input schemas
export const FilePathInputSchema = z.object({
    path: z.string().describe('The file path relative to the working directory'),
});
export const FileContentInputSchema = z.object({
    path: z.string().describe('The file path relative to the working directory'),
    content: z.string().describe('The content to write to the file'),
});
export const GlobPatternInputSchema = z.object({
    pattern: z.string().describe('Glob pattern to match files'),
    cwd: z.string().optional().describe('Working directory for the glob'),
});
export const CommandInputSchema = z.object({
    command: z.string().describe('The command to execute'),
    args: z.array(z.string()).optional().describe('Command arguments'),
    cwd: z.string().optional().describe('Working directory'),
    timeout: z.number().optional().describe('Timeout in milliseconds'),
});
//# sourceMappingURL=tool.js.map