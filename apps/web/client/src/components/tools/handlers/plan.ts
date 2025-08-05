import type { EditorEngine } from '@/components/store/editor/engine';
import {
    EXIT_PLAN_MODE_TOOL_PARAMETERS,
    TODO_WRITE_TOOL_PARAMETERS
} from '@onlook/ai';
import { z } from 'zod';

export async function handleTodoWriteTool(args: z.infer<typeof TODO_WRITE_TOOL_PARAMETERS>, editorEngine: EditorEngine): Promise<string> {
    console.log('Todo list updated:');
    args.todos.forEach(todo => {
        console.log(`[${todo.status.toUpperCase()}] ${todo.content} (${todo.priority})`);
    });

    return `Todo list updated with ${args.todos.length} items`;
}

export async function handleExitPlanModeTool(args: z.infer<typeof EXIT_PLAN_MODE_TOOL_PARAMETERS>, editorEngine: EditorEngine): Promise<string> {
    console.log('Exiting plan mode with plan:');
    console.log(args.plan);

    return 'Exited plan mode, ready to implement';
}
