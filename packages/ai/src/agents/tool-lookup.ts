import { ListFilesTool, ReadFileTool, BashReadTool, OnlookInstructionsTool, ReadStyleGuideTool, ListBranchesTool, ScrapeUrlTool, WebSearchTool, GlobTool, GrepTool, TypecheckTool, CheckErrorsTool, SearchReplaceEditTool, SearchReplaceMultiEditFileTool, FuzzyEditFileTool, WriteFileTool, BashEditTool, SandboxTool, TerminalCommandTool, ViewImageTool, UploadImageTool } from "../tools";
import { UserAgentTool } from "./tools";

export const allTools = [
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
    SearchReplaceEditTool,
    SearchReplaceMultiEditFileTool,
    FuzzyEditFileTool,
    WriteFileTool,
    BashEditTool,
    SandboxTool,
    TerminalCommandTool,
    ViewImageTool,
    UploadImageTool,
    // UserAgentTool,
];


export const readOnlyRootTools = [
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
    ViewImageTool,
    // UserAgentTool,
]
const editOnlyRootTools = [
    SearchReplaceEditTool,
    SearchReplaceMultiEditFileTool,
    FuzzyEditFileTool,
    WriteFileTool,
    BashEditTool,
    SandboxTool,
    TerminalCommandTool,
    UploadImageTool,
    // UserAgentTool
]

export const rootTools = [...readOnlyRootTools, ...editOnlyRootTools];

export const userTools = [
    ListBranchesTool,
    ListFilesTool,
]
