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

export const readOnlyTools: ToolSet = {
    [ListFilesTool.name]: ListFilesTool.getAITool(),
    [ReadFileTool.name]: ReadFileTool.getAITool(),
    [BashReadTool.name]: BashReadTool.getAITool(),
    [OnlookInstructionsTool.name]: OnlookInstructionsTool.getAITool(),
    [ReadStyleGuideTool.name]: ReadStyleGuideTool.getAITool(),
    [ListBranchesTool.name]: ListBranchesTool.getAITool(),
    [ScrapeUrlTool.name]: ScrapeUrlTool.getAITool(),
    [WebSearchTool.name]: WebSearchTool.getAITool(),
    [GlobTool.name]: GlobTool.getAITool(),
    [GrepTool.name]: GrepTool.getAITool(),
    [TypecheckTool.name]: TypecheckTool.getAITool(),
    [CheckErrorsTool.name]: CheckErrorsTool.getAITool(),
};

export const editTools: ToolSet = {
    ...readOnlyTools,
    [SearchReplaceEditTool.name]: SearchReplaceEditTool.getAITool(),
    [SearchReplaceMultiEditFileTool.name]: SearchReplaceMultiEditFileTool.getAITool(),
    [FuzzyEditFileTool.name]: FuzzyEditFileTool.getAITool(),
    [WriteFileTool.name]: WriteFileTool.getAITool(),
    [BashEditTool.name]: BashEditTool.getAITool(),
    [SandboxTool.name]: SandboxTool.getAITool(),
    [TerminalCommandTool.name]: TerminalCommandTool.getAITool(),
};

export type ChatTools = InferUITools<typeof editTools>;

export function getToolSetFromType(chatType: ChatType) {
    return chatType === ChatType.ASK ? readOnlyTools : editTools;
}