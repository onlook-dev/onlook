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
    UploadImageTool,
    WebSearchTool,
    WriteFileTool,
} from './classes';
import type { BaseTool } from './models/base';

// Helper function to convert tool classes to ToolSet
function createToolSet(toolClasses: Array<{ toolName: string; getAITool: () => any }>): ToolSet {
    return toolClasses.reduce((acc, toolClass) => {
        acc[toolClass.toolName] = toolClass.getAITool();
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
    UploadImageTool,
];
const allToolClasses = [...readOnlyToolClasses, ...editOnlyToolClasses];

export const readOnlyToolset: ToolSet = createToolSet(readOnlyToolClasses);
export const allToolset: ToolSet = createToolSet(allToolClasses);
export const TOOLS_MAP: Map<string, typeof BaseTool> = new Map(allToolClasses.map(toolClass => [toolClass.toolName, toolClass]));

export function getToolClassesFromType(chatType: ChatType) {
    return chatType === ChatType.ASK ? readOnlyToolClasses : allToolClasses
}

export function getToolSetFromType(chatType: ChatType) {
    return chatType === ChatType.ASK ? readOnlyToolset : allToolset;
}

export type ChatTools = InferUITools<typeof allToolset>;
