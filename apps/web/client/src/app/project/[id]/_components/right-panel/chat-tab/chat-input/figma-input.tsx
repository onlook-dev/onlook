import { useEditorEngine } from '@/components/store/editor';
import { api } from '@/trpc/react';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { Label } from '@onlook/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@onlook/ui/popover';
import { toast } from '@onlook/ui/sonner';
import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '@onlook/ui/tooltip';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';

export const FigmaInput = observer(({ disabled }: { disabled: boolean }) => {
    const [figmaUrl, setFigmaUrl] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const editorEngine = useEditorEngine();

    const utils = api.useUtils();

    const buildDesignContent = (designData: any, figmaUrl?: string, isSelection = false) => {
        const displayName = designData.node.name || (isSelection ? 'Figma Selection' : 'Figma Design');

        // Creates rich content with available data
        let content = `${isSelection ? 'Figma Selection' : 'Figma Design'}: ${displayName}\n`;
        content += `Type: ${designData.node.type}\n`;
        if (figmaUrl) {
            content += `URL: ${figmaUrl}\n`;
        }
        content += '\n';

        let successfulFeatures: string[] = [];

        // Add code if available
        if (designData.code) {
            content += `Code (React/Tailwind):\n\`\`\`tsx\n${designData.code}\n\`\`\`\n\n`;
            successfulFeatures.push('React/Tailwind code');
        } else {
            successfulFeatures.push('Code (no data fetched)');
        }

        // Add variables if available
        if (designData.variables_defs) {
            const varsData = typeof designData.variables_defs === 'string'
                ? designData.variables_defs
                : JSON.stringify(designData.variables_defs, null, 2);
            content += `Design Variables:\n\`\`\`json\n${varsData}\n\`\`\`\n\n`;
            successfulFeatures.push('Design variables');
        } else {
            successfulFeatures.push('Variables (no data fetched)');
        }

        // Add image info if available
        if (designData.image) {
            content += `Design Image: Available\n`;
            successfulFeatures.push('Design screenshot');
        } else {
            successfulFeatures.push('Screenshot (no data fetched)');
        }

        return { content, successfulFeatures, displayName };
    };

    const handleAddFigmaUrl = async () => {
        if (!figmaUrl.trim()) {
            toast.error('Please enter a Figma URL');
            return;
        }

        setIsLoading(true);
        try {
            // Get design data from URL using (server-side MCP)
            const result = await utils.figma.getDesignFromUrl.fetch({ figmaUrl: figmaUrl.trim() });

            if (result.success && result.data) {
                const designData = result.data;
                const { content, displayName } = buildDesignContent(designData, figmaUrl.trim(), false);

                // Add to context
                editorEngine.chat.context.addFigmaContext(
                    figmaUrl.trim(),
                    result.nodeId || designData.node.id,
                    displayName,
                    content,
                    'Figma File'
                );

                toast.success(`Added Figma design: ${displayName}`);

                setFigmaUrl('');
                setIsOpen(false);
            }
        } catch (error) {
            console.error('Error adding Figma design:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to add Figma design. Make sure Figma desktop app is running with MCP server enabled.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddCurrentSelection = async () => {
        setIsLoading(true);
        try {
            // Get current selection using (server-side MCP)
            const result = await utils.figma.getCurrentSelection.fetch();

            if (result.success && result.data) {
                const designData = result.data;
                const { content, displayName } = buildDesignContent(designData, undefined, true);

                // Add to context (using node ID as URL since we don't have the actual URL)
                editorEngine.chat.context.addFigmaContext(
                    `figma://selection/${designData.node.id}`,
                    designData.node.id,
                    displayName,
                    content,
                    'Figma Selection'
                );

                toast.success(`Added Figma selection: ${displayName}`);

                setIsOpen(false);
            }
        } catch (error) {
            console.error('Error adding Figma selection:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to add Figma selection. Make sure Figma desktop app is running with MCP server enabled.');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePasteFromClipboard = async () => {
        try {
            if (!navigator.clipboard) {
                toast.error('Clipboard access not available');
                return;
            }

            const text = await navigator.clipboard.readText();
            if (text && text.includes('figma.com')) {
                setFigmaUrl(text);
                toast.success('Pasted Figma URL from clipboard');
            } else {
                toast.error('No valid Figma URL found in clipboard');
            }
        } catch (error) {
            if (error instanceof Error && error.name === 'NotAllowedError') {
                toast.error('Clipboard access denied. Please grant permission.');
            } else {
                toast.error('Failed to read clipboard');
            }
        }
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                        <Button
                            variant={'ghost'}
                            size={'icon'}
                            className="w-9 h-9 text-foreground-tertiary group hover:bg-transparent cursor-pointer"
                            disabled={disabled}
                        >
                            <Icons.FigmaLogo
                                className={cn(
                                    'w-5 h-5',
                                    disabled
                                        ? 'text-foreground-tertiary'
                                        : 'group-hover:text-foreground',
                                )}
                            />
                        </Button>
                    </PopoverTrigger>
                </TooltipTrigger>
                <TooltipPortal>
                    <TooltipContent side="top" sideOffset={5}>
                        {disabled ? 'Select an element to start' : 'Add Figma Design'}
                    </TooltipContent>
                </TooltipPortal>
            </Tooltip>
            <PopoverContent className="w-80 p-4" side="top" align="start">
                <div className="space-y-4">
                    <div>
                        <h4 className="font-medium text-sm mb-2">Add Figma Design</h4>
                        <p className="text-xs text-foreground-secondary mb-3">
                            Get React code, design variables, and images from Figma designs
                        </p>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <Label htmlFor="figma-url" className="text-xs">Figma URL</Label>
                            <div className="flex gap-2 mt-1">
                                <Input
                                    id="figma-url"
                                    placeholder="https://www.figma.com/file/..."
                                    value={figmaUrl}
                                    onChange={(e) => setFigmaUrl(e.target.value)}
                                    className="text-xs"
                                />
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handlePasteFromClipboard}
                                    className="px-2"
                                    title="Paste from clipboard"
                                >
                                    <Icons.Clipboard className="w-3 h-3" />
                                </Button>
                            </div>
                        </div>

                        <Button
                            onClick={handleAddFigmaUrl}
                            disabled={!figmaUrl.trim() || isLoading}
                            className="w-full text-xs"
                            size="sm"
                        >
                            {isLoading ? (
                                <>
                                    <Icons.Shadow className="w-3 h-3 mr-2 animate-spin" />
                                    Getting design data...
                                </>
                            ) : (
                                'Add from URL'
                            )}
                        </Button>

                        <div className="flex items-center gap-2">
                            <div className="flex-1 border-t border-border"></div>
                            <span className="text-xs text-foreground-secondary">or</span>
                            <div className="flex-1 border-t border-border"></div>
                        </div>

                        <Button
                            onClick={handleAddCurrentSelection}
                            disabled={isLoading}
                            variant="outline"
                            className="w-full text-xs"
                            size="sm"
                        >
                            {isLoading ? (
                                <>
                                    <Icons.Shadow className="w-3 h-3 mr-2 animate-spin" />
                                    Getting selection...
                                </>
                            ) : (
                                'Current Selection'
                            )}
                        </Button>

                        <div className="text-xs text-foreground-secondary space-y-1">
                            <p>Ensure your Figma desktop app is running with MCP server enabled</p>
                        </div>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}); 