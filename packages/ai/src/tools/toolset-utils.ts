import type { ToolSet } from "ai";

// Helper function to convert tool classes to ToolSet
export function createToolSet(toolClasses: Array<{ toolName: string; getAITool: () => ToolSet[string] }>): ToolSet {
    return toolClasses.reduce((acc, toolClass) => {
        acc[toolClass.toolName] = toolClass.getAITool();
        return acc;
    }, {} as ToolSet);
}