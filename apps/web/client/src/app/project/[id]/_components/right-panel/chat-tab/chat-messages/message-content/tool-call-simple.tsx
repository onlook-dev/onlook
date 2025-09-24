import type { ToolUIPart } from 'ai';

import { TOOLS_MAP } from '@onlook/ai';
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from '@onlook/ui/ai-elements';
import { Icons } from '@onlook/ui/icons';

export function ToolCallSimple({
    toolPart,
    className,
    loading,
}: {
    toolPart: ToolUIPart;
    className?: string;
    loading?: boolean;
}) {
    const toolName = toolPart.type.split('-')[1] ?? '';
    const toolClass = TOOLS_MAP.get(toolName);
    const Icon = toolClass?.icon ?? Icons.QuestionMarkCircled;
    const title = toolClass
        ? getToolLabel(toolClass, toolPart.input)
        : getDefaultToolLabel(toolName);

    return (
        <Tool className={className}>
            <ToolHeader
                loading={loading}
                title={title}
                type={toolPart.type}
                state={toolPart.state}
                icon={<Icon className="h-4 w-4 flex-shrink-0" />}
            />
            <ToolContent>
                <ToolInput input={toolPart.input} />
                <ToolOutput errorText={toolPart.errorText} output={toolPart.output} />
            </ToolContent>
        </Tool>
    );
}

function getDefaultToolLabel(toolName: string): string {
    return toolName?.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function getToolLabel(toolClass: any, input: unknown): string {
    try {
        const toolInstance = new toolClass();
        if (typeof toolInstance.getLabel === 'function') {
            return toolInstance.getLabel(input);
        }
        return getDefaultToolLabel(toolClass.name);
    } catch (error) {
        console.error('Error getting tool label:', error);
        return getDefaultToolLabel(toolClass.name);
    }
}
