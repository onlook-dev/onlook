import type { EditorEngine } from '@/components/store/editor/engine';
import { BASH_EDIT_TOOL_PARAMETERS, EDIT_TOOL_PARAMETERS, EXIT_PLAN_MODE_TOOL_PARAMETERS, MULTI_EDIT_TOOL_PARAMETERS, NOTEBOOK_EDIT_TOOL_PARAMETERS, TODO_WRITE_TOOL_PARAMETERS, WRITE_TOOL_PARAMETERS } from '@onlook/ai';
import { z } from 'zod';

export async function handleBashEditTool(args: z.infer<typeof BASH_EDIT_TOOL_PARAMETERS>, editorEngine: EditorEngine): Promise<{
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

export async function handleEditTool(args: z.infer<typeof EDIT_TOOL_PARAMETERS>, editorEngine: EditorEngine): Promise<string> {
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

export async function handleMultiEditTool(args: z.infer<typeof MULTI_EDIT_TOOL_PARAMETERS>, editorEngine: EditorEngine): Promise<string> {
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

export async function handleWriteTool(args: z.infer<typeof WRITE_TOOL_PARAMETERS>, editorEngine: EditorEngine): Promise<string> {
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

export async function handleNotebookEditTool(args: z.infer<typeof NOTEBOOK_EDIT_TOOL_PARAMETERS>, editorEngine: EditorEngine): Promise<string> {
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
