import { ChatType } from '@onlook/models';
import { type InferUITools, type ToolSet } from 'ai';
import {
    BashEditTool,
    BashReadTool,
    CheckErrorsTool,
    FuzzyEditFileTool,
    GlobTool,
    GrepTool,
    ListBranchesTool,
    ListFilesTool,
    OnlookInstructionsTool,
    ReadFileTool,
    ReadStyleGuideTool,
    SandboxTool,
    ScrapeUrlTool,
    SearchReplaceEditTool,
    SearchReplaceMultiEditFileTool,
    TerminalCommandTool,
    TypecheckTool,
    WebSearchTool,
    WriteFileTool,
} from './classes';

// Helper function to convert tool classes to ToolSet
function createToolSet(toolClasses: Array<{ name: string; getAITool: () => any }>): ToolSet {
    return toolClasses.reduce((acc, toolClass) => {
        acc[toolClass.name] = toolClass.getAITool();
        return acc;
    }, {} as ToolSet);
}

const readOnlyToolClasses = [
    ListFilesTool,
    ReadFileTool,
    BashReadTool,
    OnlookInstructionsTool,
    ReadStyleGuideTool,
    ListBranchesTool,
    ScrapeUrlTool,
    WebSearchTool,
    GlobTool,
    GrepTool,
    TypecheckTool,
    CheckErrorsTool,
];

const editOnlyToolClasses = [
    SearchReplaceEditTool,
    SearchReplaceMultiEditFileTool,
    FuzzyEditFileTool,
    WriteFileTool,
    BashEditTool,
    SandboxTool,
    TerminalCommandTool,
];

export const readOnlyTools: ToolSet = createToolSet(readOnlyToolClasses);
export const allTools: ToolSet = createToolSet([...readOnlyToolClasses, ...editOnlyToolClasses]);
export function getToolSetFromType(chatType: ChatType) {
    return chatType === ChatType.ASK ? readOnlyTools : allTools;
}
export function getToolClassesFromType(chatType: ChatType) {
    return chatType === ChatType.ASK ? readOnlyToolClasses : [...readOnlyToolClasses, ...editOnlyToolClasses];
}
export type ChatTools = InferUITools<typeof allTools>;
