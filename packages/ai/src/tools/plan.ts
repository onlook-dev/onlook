import { tool } from 'ai';
import { z } from 'zod';

// Not used
const TASK_TOOL_NAME = 'task';
const TASK_TOOL_PARAMETERS = z.object({
    description: z.string().min(3).max(50).describe('Short task description (3-5 words)'),
    prompt: z.string().describe('Detailed task for the agent'),
    subagent_type: z.enum(['general-purpose']).describe('Agent type'),
});
const taskTool = tool({
    description: 'Launch specialized agents for analysis tasks',
    parameters: TASK_TOOL_PARAMETERS,
});

export const TODO_WRITE_TOOL_NAME = 'todo_write';
export const TODO_WRITE_TOOL_PARAMETERS = z.object({
    todos: z
        .array(
            z.object({
                content: z.string().min(1).describe('Todo content'),
                status: z.enum(['pending', 'in_progress', 'completed']).describe('Todo status'),
                priority: z.enum(['high', 'medium', 'low']).describe('Todo priority'),
                id: z.string().describe('Todo ID'),
            }),
        )
        .describe('Array of todo objects'),
});
export const todoWriteTool = tool({
    description: 'Create and manage structured task lists for coding sessions',
    parameters: TODO_WRITE_TOOL_PARAMETERS,
});

export const EXIT_PLAN_MODE_TOOL_NAME = 'exit_plan_mode';
export const EXIT_PLAN_MODE_TOOL_PARAMETERS = z.object({
    plan: z.string().describe('Implementation plan in markdown'),
});
export const exitPlanModeTool = tool({
    description: 'Exit planning mode when ready to implement code',
    parameters: EXIT_PLAN_MODE_TOOL_PARAMETERS,
});
