import type { EditorEngine } from '@/components/store/editor/engine';
import { z } from 'zod';

// EDIT TOOLS - For file modification and editing capabilities

// Tool parameter schemas for editing operations
export const BASH_EDIT_TOOL_PARAMETERS = z.object({
    command: z.string().describe('Command that modifies files (mkdir, rm, mv, etc.)'),
    description: z.string().optional().describe('What the command does (5-10 words)'),
    timeout: z.number().max(600000).optional().describe('Optional timeout in milliseconds')
});

export const EDIT_TOOL_PARAMETERS = z.object({
    file_path: z.string().describe('Absolute path to file'),
    old_string: z.string().describe('Text to replace'),
    new_string: z.string().describe('Replacement text'),
    replace_all: z.boolean().optional().default(false).describe('Replace all occurrences')
});

export const MULTI_EDIT_TOOL_PARAMETERS = z.object({
    file_path: z.string().describe('Absolute path to file'),
    edits: z.array(z.object({
        old_string: z.string().describe('Text to replace'),
        new_string: z.string().describe('Replacement text'),
        replace_all: z.boolean().optional().default(false).describe('Replace all occurrences')
    })).describe('Array of edit operations')
});

export const WRITE_TOOL_PARAMETERS = z.object({
    file_path: z.string().describe('Absolute path to file'),
    content: z.string().describe('File content')
});

export const NOTEBOOK_EDIT_TOOL_PARAMETERS = z.object({
    notebook_path: z.string().describe('Absolute path to .ipynb file'),
    new_source: z.string().describe('Cell content'),
    cell_id: z.string().optional().describe('Cell ID to edit'),
    cell_type: z.enum(['code', 'markdown']).optional().describe('Cell type'),
    edit_mode: z.enum(['replace', 'insert', 'delete']).optional().default('replace').describe('Edit mode')
});

export const TODO_WRITE_TOOL_PARAMETERS = z.object({
    todos: z.array(z.object({
        content: z.string().min(1).describe('Todo content'),
        status: z.enum(['pending', 'in_progress', 'completed']).describe('Todo status'),
        priority: z.enum(['high', 'medium', 'low']).describe('Todo priority'),
        id: z.string().describe('Todo ID')
    })).describe('Array of todo objects')
});

export const EXIT_PLAN_MODE_TOOL_PARAMETERS = z.object({
    plan: z.string().describe('Implementation plan in markdown')
});

// Tool name constants for editing operations
export const BASH_EDIT_TOOL_NAME = 'bash_edit';
export const EDIT_TOOL_NAME = 'edit';
export const MULTI_EDIT_TOOL_NAME = 'multi_edit';
export const WRITE_TOOL_NAME = 'write';
export const NOTEBOOK_EDIT_TOOL_NAME = 'notebook_edit';
export const TODO_WRITE_TOOL_NAME = 'todo_write';
export const EXIT_PLAN_MODE_TOOL_NAME = 'exit_plan_mode';

// Edit tool handlers
export async function handleEditToolCall(
    toolName: string,
    args: any,
    editorEngine: EditorEngine
): Promise<any> {
    try {
        switch (toolName) {
            case BASH_EDIT_TOOL_NAME:
                return await handleBashEditTool(args as z.infer<typeof BASH_EDIT_TOOL_PARAMETERS>, editorEngine);
            case EDIT_TOOL_NAME:
                return await handleEditTool(args as z.infer<typeof EDIT_TOOL_PARAMETERS>, editorEngine);
            case MULTI_EDIT_TOOL_NAME:
                return await handleMultiEditTool(args as z.infer<typeof MULTI_EDIT_TOOL_PARAMETERS>, editorEngine);
            case WRITE_TOOL_NAME:
                return await handleWriteTool(args as z.infer<typeof WRITE_TOOL_PARAMETERS>, editorEngine);
            case NOTEBOOK_EDIT_TOOL_NAME:
                return await handleNotebookEditTool(args as z.infer<typeof NOTEBOOK_EDIT_TOOL_PARAMETERS>, editorEngine);
            case TODO_WRITE_TOOL_NAME:
                return await handleTodoWriteTool(args as z.infer<typeof TODO_WRITE_TOOL_PARAMETERS>, editorEngine);
            case EXIT_PLAN_MODE_TOOL_NAME:
                return await handleExitPlanModeTool(args as z.infer<typeof EXIT_PLAN_MODE_TOOL_PARAMETERS>, editorEngine);
            default:
                throw new Error(`Unknown edit tool: ${toolName}`);
        }
    } catch (error) {
        console.error(`Error handling edit tool ${toolName}:`, error);
        throw error;
    }
}

// Individual edit tool implementations
async function handleBashEditTool(args: z.infer<typeof BASH_EDIT_TOOL_PARAMETERS>, editorEngine: EditorEngine): Promise<{
    output: string;
    success: boolean;
    error: string | null;
}> {
    try {
        // Allow editing commands (mkdir, rm, mv, cp, touch, etc.)
        const editCommands = ['mkdir', 'rm', 'rmdir', 'mv', 'cp', 'touch', 'chmod', 'chown', 'ln', 'git'];
        const commandParts = args.command.trim().split(/\s+/);
        const baseCommand = commandParts[0] || '';

        const isEditCommand = editCommands.some(cmd => baseCommand.includes(cmd));
        if (!isEditCommand) {
            return {
                output: '',
                success: false,
                error: `Command '${baseCommand}' is not allowed in edit mode. Only ${editCommands.join(', ')} commands are permitted.`
            };
        }

        const result = await editorEngine.sandbox.session.runCommand(args.command);
        return {
            output: result.output,
            success: result.success,
            error: result.error
        };
    } catch (error: any) {
        return {
            output: '',
            success: false,
            error: error.message || error.toString()
        };
    }
}

async function handleEditTool(args: z.infer<typeof EDIT_TOOL_PARAMETERS>, editorEngine: EditorEngine): Promise<string> {
    try {
        const file = await editorEngine.sandbox.readFile(args.file_path);
        if (!file || file.type !== 'text') {
            throw new Error(`Cannot read file ${args.file_path}: file not found or not text`);
        }

        let newContent: string;
        if (args.replace_all) {
            newContent = file.content.replaceAll(args.old_string, args.new_string);
        } else {
            if (!file.content.includes(args.old_string)) {
                throw new Error(`String not found in file: ${args.old_string}`);
            }

            const occurrences = file.content.split(args.old_string).length - 1;
            if (occurrences > 1) {
                throw new Error(`Multiple occurrences found. Use replace_all=true or provide more context.`);
            }

            newContent = file.content.replace(args.old_string, args.new_string);
        }

        const result = await editorEngine.sandbox.writeFile(args.file_path, newContent);
        if (!result) {
            throw new Error(`Failed to write file ${args.file_path}`);
        }

        return `File ${args.file_path} edited successfully`;
    } catch (error) {
        throw new Error(`Cannot edit file ${args.file_path}: ${error}`);
    }
}

async function handleMultiEditTool(args: z.infer<typeof MULTI_EDIT_TOOL_PARAMETERS>, editorEngine: EditorEngine): Promise<string> {
    try {
        const file = await editorEngine.sandbox.readFile(args.file_path);
        if (!file || file.type !== 'text') {
            throw new Error(`Cannot read file ${args.file_path}: file not found or not text`);
        }

        let content = file.content;

        for (const edit of args.edits) {
            if (edit.replace_all) {
                content = content.replaceAll(edit.old_string, edit.new_string);
            } else {
                if (!content.includes(edit.old_string)) {
                    throw new Error(`String not found in file: ${edit.old_string}`);
                }

                const occurrences = content.split(edit.old_string).length - 1;
                if (occurrences > 1) {
                    throw new Error(`Multiple occurrences found for "${edit.old_string}". Use replace_all=true or provide more context.`);
                }

                content = content.replace(edit.old_string, edit.new_string);
            }
        }

        const result = await editorEngine.sandbox.writeFile(args.file_path, content);
        if (!result) {
            throw new Error(`Failed to write file ${args.file_path}`);
        }

        return `File ${args.file_path} edited with ${args.edits.length} changes`;
    } catch (error) {
        throw new Error(`Cannot multi-edit file ${args.file_path}: ${error}`);
    }
}

async function handleWriteTool(args: z.infer<typeof WRITE_TOOL_PARAMETERS>, editorEngine: EditorEngine): Promise<string> {
    try {
        const result = await editorEngine.sandbox.writeFile(args.file_path, args.content);
        if (!result) {
            throw new Error(`Failed to write file ${args.file_path}`);
        }
        return `File ${args.file_path} written successfully`;
    } catch (error) {
        throw new Error(`Cannot write file ${args.file_path}: ${error}`);
    }
}

async function handleNotebookEditTool(args: z.infer<typeof NOTEBOOK_EDIT_TOOL_PARAMETERS>, editorEngine: EditorEngine): Promise<string> {
    try {
        const file = await editorEngine.sandbox.readFile(args.notebook_path);
        if (!file || file.type !== 'text') {
            throw new Error(`Cannot read notebook ${args.notebook_path}: file not found or not text`);
        }

        const notebook = JSON.parse(file.content);

        if (args.edit_mode === 'delete') {
            if (!args.cell_id) {
                throw new Error('Cell ID required for delete operation');
            }
            notebook.cells = notebook.cells.filter((c: any) => c.id !== args.cell_id);
        } else if (args.edit_mode === 'insert') {
            const newCell = {
                id: args.cell_id || `cell-${Date.now()}`,
                cell_type: args.cell_type || 'code',
                source: args.new_source.split('\n'),
                metadata: {}
            };

            if (args.cell_id) {
                const index = notebook.cells.findIndex((c: any) => c.id === args.cell_id);
                notebook.cells.splice(index + 1, 0, newCell);
            } else {
                notebook.cells.push(newCell);
            }
        } else {
            // replace mode
            if (args.cell_id) {
                const cell = notebook.cells.find((c: any) => c.id === args.cell_id);
                if (!cell) {
                    throw new Error(`Cell with ID ${args.cell_id} not found`);
                }
                cell.source = args.new_source.split('\n');
                if (args.cell_type) {
                    cell.cell_type = args.cell_type;
                }
            }
        }

        const result = await editorEngine.sandbox.writeFile(args.notebook_path, JSON.stringify(notebook, null, 2));
        if (!result) {
            throw new Error(`Failed to write notebook ${args.notebook_path}`);
        }

        return `Notebook ${args.notebook_path} edited successfully`;
    } catch (error) {
        throw new Error(`Cannot edit notebook ${args.notebook_path}: ${error}`);
    }
}

async function handleTodoWriteTool(args: z.infer<typeof TODO_WRITE_TOOL_PARAMETERS>, editorEngine: EditorEngine): Promise<string> {
    console.log('Todo list updated:');
    args.todos.forEach(todo => {
        console.log(`[${todo.status.toUpperCase()}] ${todo.content} (${todo.priority})`);
    });

    return `Todo list updated with ${args.todos.length} items`;
}

async function handleExitPlanModeTool(args: z.infer<typeof EXIT_PLAN_MODE_TOOL_PARAMETERS>, editorEngine: EditorEngine): Promise<string> {
    console.log('Exiting plan mode with plan:');
    console.log(args.plan);

    return 'Exited plan mode, ready to implement';
}

// Export all edit tool definitions
export const EDIT_TOOLS = {
    [BASH_EDIT_TOOL_NAME]: {
        name: BASH_EDIT_TOOL_NAME,
        description: 'Execute file modification commands',
        parameters: BASH_EDIT_TOOL_PARAMETERS
    },
    [EDIT_TOOL_NAME]: {
        name: EDIT_TOOL_NAME,
        description: 'Make exact string replacements in files',
        parameters: EDIT_TOOL_PARAMETERS
    },
    [MULTI_EDIT_TOOL_NAME]: {
        name: MULTI_EDIT_TOOL_NAME,
        description: 'Make multiple edits to a single file',
        parameters: MULTI_EDIT_TOOL_PARAMETERS
    },
    [WRITE_TOOL_NAME]: {
        name: WRITE_TOOL_NAME,
        description: 'Write/overwrite file contents',
        parameters: WRITE_TOOL_PARAMETERS
    },
    [NOTEBOOK_EDIT_TOOL_NAME]: {
        name: NOTEBOOK_EDIT_TOOL_NAME,
        description: 'Edit Jupyter notebook cells',
        parameters: NOTEBOOK_EDIT_TOOL_PARAMETERS
    },
    [TODO_WRITE_TOOL_NAME]: {
        name: TODO_WRITE_TOOL_NAME,
        description: 'Create and manage task lists',
        parameters: TODO_WRITE_TOOL_PARAMETERS
    },
    [EXIT_PLAN_MODE_TOOL_NAME]: {
        name: EXIT_PLAN_MODE_TOOL_NAME,
        description: 'Exit planning mode when ready to code',
        parameters: EXIT_PLAN_MODE_TOOL_PARAMETERS
    }
};