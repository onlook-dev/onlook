// Export all tools for easy import
export * from './read-tools';
export * from './edit-tools';
export * from './tools';

// Re-export with more convenient naming
export {
    READ_TOOLS,
    handleReadToolCall as handleReadTool
} from './read-tools';

export {
    EDIT_TOOLS,
    handleEditToolCall as handleEditTool
} from './edit-tools';

// Tool categories for organization
export const READ_ONLY_TOOLS = {
    AGENT_TOOLS: ['task'],
    SYSTEM_READ_TOOLS: ['bash_read'],
    FILE_READ_TOOLS: ['glob', 'ls', 'read'],
    SEARCH_TOOLS: ['grep'],
    NOTEBOOK_READ_TOOLS: ['notebook_read'],
    WEB_TOOLS: ['web_fetch', 'web_search']
};

export const EDIT_TOOLS_CATEGORIES = {
    SYSTEM_EDIT_TOOLS: ['bash_edit'],
    FILE_EDIT_TOOLS: ['edit', 'multi_edit', 'write'],
    NOTEBOOK_EDIT_TOOLS: ['notebook_edit'],
    UTILITY_TOOLS: ['todo_write', 'exit_plan_mode']
};

export const ALL_READ_TOOLS = [
    ...READ_ONLY_TOOLS.AGENT_TOOLS,
    ...READ_ONLY_TOOLS.SYSTEM_READ_TOOLS,
    ...READ_ONLY_TOOLS.FILE_READ_TOOLS,
    ...READ_ONLY_TOOLS.SEARCH_TOOLS,
    ...READ_ONLY_TOOLS.NOTEBOOK_READ_TOOLS,
    ...READ_ONLY_TOOLS.WEB_TOOLS
];

export const ALL_EDIT_TOOLS = [
    ...EDIT_TOOLS_CATEGORIES.SYSTEM_EDIT_TOOLS,
    ...EDIT_TOOLS_CATEGORIES.FILE_EDIT_TOOLS,
    ...EDIT_TOOLS_CATEGORIES.NOTEBOOK_EDIT_TOOLS,
    ...EDIT_TOOLS_CATEGORIES.UTILITY_TOOLS
];