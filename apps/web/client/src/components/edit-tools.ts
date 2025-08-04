import type { EditorEngine } from '@/components/store/editor/engine';
import { z } from 'zod';

// Tool parameter schemas
export const TASK_TOOL_PARAMETERS = z.object({
    description: z.string().min(3).max(50).describe('Short task description (3-5 words)'),
    prompt: z.string().describe('Detailed task for the agent'),
    subagent_type: z.enum(['general-purpose']).describe('Agent type')
});

export const BASH_TOOL_PARAMETERS = z.object({
    command: z.string().describe('Command to execute'),
    description: z.string().optional().describe('What the command does (5-10 words)'),
    timeout: z.number().max(600000).optional().describe('Optional timeout in milliseconds')
});

export const GLOB_TOOL_PARAMETERS = z.object({
    pattern: z.string().describe('Glob pattern like "**/*.js"'),
    path: z.string().optional().describe('Directory to search (optional, defaults to current)')
});

export const GREP_TOOL_PARAMETERS = z.object({
    pattern: z.string().describe('Regex pattern to search'),
    path: z.string().optional().describe('File/directory to search'),
    glob: z.string().optional().describe('Filter files with glob pattern'),
    type: z.string().optional().describe('File type filter (js, py, rust, etc.)'),
    output_mode: z.enum(['content', 'files_with_matches', 'count']).optional().default('files_with_matches'),
    case_insensitive: z.boolean().optional().describe('Case insensitive search'),
    show_line_numbers: z.boolean().optional().describe('Show line numbers'),
    context_after: z.number().optional().describe('Lines after match'),
    context_before: z.number().optional().describe('Lines before match'),
    context_around: z.number().optional().describe('Lines around match'),
    multiline: z.boolean().optional().describe('Enable multiline matching'),
    head_limit: z.number().optional().describe('Limit output lines')
});

export const LS_TOOL_PARAMETERS = z.object({
    path: z.string().describe('Absolute path to list'),
    ignore: z.array(z.string()).optional().describe('Array of glob patterns to ignore')
});

export const READ_TOOL_PARAMETERS = z.object({
    file_path: z.string().describe('Absolute path to file'),
    offset: z.number().optional().describe('Starting line number'),
    limit: z.number().optional().describe('Number of lines to read')
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

export const NOTEBOOK_READ_TOOL_PARAMETERS = z.object({
    notebook_path: z.string().describe('Absolute path to .ipynb file'),
    cell_id: z.string().optional().describe('Specific cell ID')
});

export const NOTEBOOK_EDIT_TOOL_PARAMETERS = z.object({
    notebook_path: z.string().describe('Absolute path to .ipynb file'),
    new_source: z.string().describe('Cell content'),
    cell_id: z.string().optional().describe('Cell ID to edit'),
    cell_type: z.enum(['code', 'markdown']).optional().describe('Cell type'),
    edit_mode: z.enum(['replace', 'insert', 'delete']).optional().default('replace').describe('Edit mode')
});

export const WEB_FETCH_TOOL_PARAMETERS = z.object({
    url: z.string().url().describe('URL to fetch'),
    prompt: z.string().describe('Analysis prompt')
});

export const WEB_SEARCH_TOOL_PARAMETERS = z.object({
    query: z.string().min(2).describe('Search query'),
    allowed_domains: z.array(z.string()).optional().describe('Include only these domains'),
    blocked_domains: z.array(z.string()).optional().describe('Exclude these domains')
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

// Tool name constants
export const TASK_TOOL_NAME = 'task';
export const BASH_TOOL_NAME = 'bash';
export const GLOB_TOOL_NAME = 'glob';
export const GREP_TOOL_NAME = 'grep';
export const LS_TOOL_NAME = 'ls';
export const READ_TOOL_NAME = 'read';
export const EDIT_TOOL_NAME = 'edit';
export const MULTI_EDIT_TOOL_NAME = 'multi_edit';
export const WRITE_TOOL_NAME = 'write';
export const NOTEBOOK_READ_TOOL_NAME = 'notebook_read';
export const NOTEBOOK_EDIT_TOOL_NAME = 'notebook_edit';
export const WEB_FETCH_TOOL_NAME = 'web_fetch';
export const WEB_SEARCH_TOOL_NAME = 'web_search';
export const TODO_WRITE_TOOL_NAME = 'todo_write';
export const EXIT_PLAN_MODE_TOOL_NAME = 'exit_plan_mode';

// Tool handlers
export async function handleEditToolCall(
    toolName: string,
    args: any,
    editorEngine: EditorEngine
): Promise<any> {
    try {
        switch (toolName) {
            case TASK_TOOL_NAME:
                return await handleTaskTool(args as z.infer<typeof TASK_TOOL_PARAMETERS>, editorEngine);
            case BASH_TOOL_NAME:
                return await handleBashTool(args as z.infer<typeof BASH_TOOL_PARAMETERS>, editorEngine);
            case GLOB_TOOL_NAME:
                return await handleGlobTool(args as z.infer<typeof GLOB_TOOL_PARAMETERS>, editorEngine);
            case GREP_TOOL_NAME:
                return await handleGrepTool(args as z.infer<typeof GREP_TOOL_PARAMETERS>, editorEngine);
            case LS_TOOL_NAME:
                return await handleLsTool(args as z.infer<typeof LS_TOOL_PARAMETERS>, editorEngine);
            case READ_TOOL_NAME:
                return await handleReadTool(args as z.infer<typeof READ_TOOL_PARAMETERS>, editorEngine);
            case EDIT_TOOL_NAME:
                return await handleEditTool(args as z.infer<typeof EDIT_TOOL_PARAMETERS>, editorEngine);
            case MULTI_EDIT_TOOL_NAME:
                return await handleMultiEditTool(args as z.infer<typeof MULTI_EDIT_TOOL_PARAMETERS>, editorEngine);
            case WRITE_TOOL_NAME:
                return await handleWriteTool(args as z.infer<typeof WRITE_TOOL_PARAMETERS>, editorEngine);
            case NOTEBOOK_READ_TOOL_NAME:
                return await handleNotebookReadTool(args as z.infer<typeof NOTEBOOK_READ_TOOL_PARAMETERS>, editorEngine);
            case NOTEBOOK_EDIT_TOOL_NAME:
                return await handleNotebookEditTool(args as z.infer<typeof NOTEBOOK_EDIT_TOOL_PARAMETERS>, editorEngine);
            case WEB_FETCH_TOOL_NAME:
                return await handleWebFetchTool(args as z.infer<typeof WEB_FETCH_TOOL_PARAMETERS>, editorEngine);
            case WEB_SEARCH_TOOL_NAME:
                return await handleWebSearchTool(args as z.infer<typeof WEB_SEARCH_TOOL_PARAMETERS>, editorEngine);
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

// Individual tool implementations
async function handleTaskTool(args: z.infer<typeof TASK_TOOL_PARAMETERS>, editorEngine: EditorEngine): Promise<string> {
    // Launch specialized agent for complex tasks
    console.log(`Launching ${args.subagent_type} agent for: ${args.description}`);
    console.log(`Task: ${args.prompt}`);
    return `Launched ${args.subagent_type} agent to handle: ${args.description}`;
}

async function handleBashTool(args: z.infer<typeof BASH_TOOL_PARAMETERS>, editorEngine: EditorEngine): Promise<{
    output: string;
    success: boolean;
    error: string | null;
}> {
    try {
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

async function handleGlobTool(args: z.infer<typeof GLOB_TOOL_PARAMETERS>, editorEngine: EditorEngine): Promise<string[]> {
    try {
        const searchPath = args.path || '.';
        const command = `find ${searchPath} -name "${args.pattern}" 2>/dev/null | head -100`;
        const result = await editorEngine.sandbox.session.runCommand(command);
        
        if (result.success && result.output.trim()) {
            return result.output.trim().split('\n').filter(line => line.trim());
        }
        return [];
    } catch (error) {
        console.error('Glob search failed:', error);
        return [];
    }
}

async function handleGrepTool(args: z.infer<typeof GREP_TOOL_PARAMETERS>, editorEngine: EditorEngine): Promise<any> {
    try {
        const searchPath = args.path || '.';
        let command = `rg "${args.pattern}" ${searchPath}`;
        
        if (args.case_insensitive) command += ' -i';
        if (args.show_line_numbers) command += ' -n';
        if (args.context_after) command += ` -A ${args.context_after}`;
        if (args.context_before) command += ` -B ${args.context_before}`;
        if (args.context_around) command += ` -C ${args.context_around}`;
        if (args.glob) command += ` -g "${args.glob}"`;
        if (args.type) command += ` -t ${args.type}`;
        if (args.head_limit) command += ` | head -${args.head_limit}`;
        
        if (args.output_mode === 'files_with_matches') command += ' -l';
        else if (args.output_mode === 'count') command += ' -c';
        
        const result = await editorEngine.sandbox.session.runCommand(command);
        
        if (result.success) {
            const lines = result.output.trim().split('\n').filter(line => line.trim());
            return {
                matches: lines,
                mode: args.output_mode,
                count: lines.length
            };
        }
        
        return {
            matches: [],
            mode: args.output_mode,
            error: result.error
        };
    } catch (error) {
        return {
            matches: [],
            mode: args.output_mode,
            error: error instanceof Error ? error.message : String(error)
        };
    }
}

async function handleLsTool(args: z.infer<typeof LS_TOOL_PARAMETERS>, editorEngine: EditorEngine): Promise<{
    path: string;
    type: 'file' | 'directory';
}[]> {
    try {
        const result = await editorEngine.sandbox.readDir(args.path);
        if (!result) {
            throw new Error(`Cannot list directory ${args.path}`);
        }
        
        return result
            .filter(item => {
                if (args.ignore) {
                    return !args.ignore.some(pattern => {
                        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
                        return regex.test(item.name);
                    });
                }
                return true;
            })
            .map(item => ({
                path: item.name,
                type: item.type
            }));
    } catch (error) {
        throw new Error(`Cannot list directory ${args.path}: ${error}`);
    }
}

async function handleReadTool(args: z.infer<typeof READ_TOOL_PARAMETERS>, editorEngine: EditorEngine): Promise<{
    content: string;
    lines: number;
}> {
    try {
        const file = await editorEngine.sandbox.readFile(args.file_path);
        if (!file || file.type !== 'text') {
            throw new Error(`Cannot read file ${args.file_path}: file not found or not text`);
        }
        
        const lines = file.content.split('\n');
        
        if (args.offset || args.limit) {
            const start = args.offset || 0;
            const end = args.limit ? start + args.limit : lines.length;
            const selectedLines = lines.slice(start, end);
            
            return {
                content: selectedLines.map((line, index) => `${start + index + 1}→${line}`).join('\n'),
                lines: selectedLines.length
            };
        }
        
        return {
            content: lines.map((line, index) => `${index + 1}→${line}`).join('\n'),
            lines: lines.length
        };
    } catch (error) {
        throw new Error(`Cannot read file ${args.file_path}: ${error}`);
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

async function handleNotebookReadTool(args: z.infer<typeof NOTEBOOK_READ_TOOL_PARAMETERS>, editorEngine: EditorEngine): Promise<any> {
    try {
        const file = await editorEngine.sandbox.readFile(args.notebook_path);
        if (!file || file.type !== 'text') {
            throw new Error(`Cannot read notebook ${args.notebook_path}: file not found or not text`);
        }
        
        const notebook = JSON.parse(file.content);
        
        if (args.cell_id) {
            const cell = notebook.cells.find((c: any) => c.id === args.cell_id);
            if (!cell) {
                throw new Error(`Cell with ID ${args.cell_id} not found`);
            }
            return { cell };
        }
        
        return { cells: notebook.cells };
    } catch (error) {
        throw new Error(`Cannot read notebook ${args.notebook_path}: ${error}`);
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

async function handleWebFetchTool(args: z.infer<typeof WEB_FETCH_TOOL_PARAMETERS>, editorEngine: EditorEngine): Promise<string> {
    try {
        const response = await fetch(args.url.replace(/^http:/, 'https:'));
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        let content = await response.text();
        
        // Basic HTML to markdown conversion
        if (response.headers.get('content-type')?.includes('text/html')) {
            content = content
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
                .replace(/<[^>]+>/g, '')
                .replace(/\s+/g, ' ')
                .trim();
        }
        
        // Apply prompt processing with AI if available
        return `Content from ${args.url} analyzed with prompt "${args.prompt}":\n\n${content}`;
    } catch (error) {
        throw new Error(`Cannot fetch ${args.url}: ${error}`);
    }
}

async function handleWebSearchTool(args: z.infer<typeof WEB_SEARCH_TOOL_PARAMETERS>, editorEngine: EditorEngine): Promise<string> {
    // This would integrate with a search API
    console.log(`Searching for: ${args.query}`);
    if (args.allowed_domains) {
        console.log(`Allowed domains: ${args.allowed_domains.join(', ')}`);
    }
    if (args.blocked_domains) {
        console.log(`Blocked domains: ${args.blocked_domains.join(', ')}`);
    }
    
    return `Search results for "${args.query}" would appear here (search API integration needed)`;
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

// Export all tool definitions
export const EDIT_TOOLS = {
    [TASK_TOOL_NAME]: {
        name: TASK_TOOL_NAME,
        description: 'Launch specialized agents for complex tasks',
        parameters: TASK_TOOL_PARAMETERS
    },
    [BASH_TOOL_NAME]: {
        name: BASH_TOOL_NAME,
        description: 'Execute bash commands with timeout',
        parameters: BASH_TOOL_PARAMETERS
    },
    [GLOB_TOOL_NAME]: {
        name: GLOB_TOOL_NAME,
        description: 'Fast file pattern matching',
        parameters: GLOB_TOOL_PARAMETERS
    },
    [GREP_TOOL_NAME]: {
        name: GREP_TOOL_NAME,
        description: 'Powerful search using ripgrep',
        parameters: GREP_TOOL_PARAMETERS
    },
    [LS_TOOL_NAME]: {
        name: LS_TOOL_NAME,
        description: 'List files and directories',
        parameters: LS_TOOL_PARAMETERS
    },
    [READ_TOOL_NAME]: {
        name: READ_TOOL_NAME,
        description: 'Read file contents',
        parameters: READ_TOOL_PARAMETERS
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
    [NOTEBOOK_READ_TOOL_NAME]: {
        name: NOTEBOOK_READ_TOOL_NAME,
        description: 'Read Jupyter notebook cells',
        parameters: NOTEBOOK_READ_TOOL_PARAMETERS
    },
    [NOTEBOOK_EDIT_TOOL_NAME]: {
        name: NOTEBOOK_EDIT_TOOL_NAME,
        description: 'Edit Jupyter notebook cells',
        parameters: NOTEBOOK_EDIT_TOOL_PARAMETERS
    },
    [WEB_FETCH_TOOL_NAME]: {
        name: WEB_FETCH_TOOL_NAME,
        description: 'Fetch and analyze web content',
        parameters: WEB_FETCH_TOOL_PARAMETERS
    },
    [WEB_SEARCH_TOOL_NAME]: {
        name: WEB_SEARCH_TOOL_NAME,
        description: 'Search the web for current information',
        parameters: WEB_SEARCH_TOOL_PARAMETERS
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