// Export all edit tools for easy import
export * from '../edit-tools';

// Re-export with more convenient naming
export {
    EDIT_TOOLS,
    handleEditToolCall as handleTool
} from '../edit-tools';

// Tool categories for organization
export const AGENT_TOOLS = ['task'];
export const SYSTEM_TOOLS = ['bash'];
export const FILE_TOOLS = ['glob', 'ls', 'read', 'edit', 'multi_edit', 'write'];
export const SEARCH_TOOLS = ['grep'];
export const NOTEBOOK_TOOLS = ['notebook_read', 'notebook_edit'];
export const WEB_TOOLS = ['web_fetch', 'web_search'];
export const UTILITY_TOOLS = ['todo_write', 'exit_plan_mode'];

export const ALL_EDIT_TOOLS = [
    ...AGENT_TOOLS,
    ...SYSTEM_TOOLS, 
    ...FILE_TOOLS,
    ...SEARCH_TOOLS,
    ...NOTEBOOK_TOOLS,
    ...WEB_TOOLS,
    ...UTILITY_TOOLS
];