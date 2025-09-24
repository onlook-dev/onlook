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
const allToolClasses = [...readOnlyToolClasses, ...editOnlyToolClasses];

export const readOnlyToolset: ToolSet = createToolSet(readOnlyToolClasses);
export const allToolset: ToolSet = createToolSet(allToolClasses);
export const TOOLS_MAP = new Map(allToolClasses.map(toolClass => [toolClass.name, toolClass]));

export function getToolClassesFromType(chatType: ChatType) {
    return chatType === ChatType.ASK ? readOnlyToolClasses : allToolClasses
}

export function getToolSetFromType(chatType: ChatType) {
    return chatType === ChatType.ASK ? readOnlyToolset : allToolset;
}

export type ChatTools = InferUITools<typeof allToolset>;
