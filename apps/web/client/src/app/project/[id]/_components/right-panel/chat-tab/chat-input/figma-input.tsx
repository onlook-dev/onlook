import { useEditorEngine } from '@/components/store/editor';
import { api } from '@/trpc/react';
import { Button } from '@onlook/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@onlook/ui/dialog';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { toast } from '@onlook/ui/sonner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';

interface FigmaNode {
    id: string;
    name: string;
    type: string;
    visible: boolean;
}

interface FigmaDesignData {
    node: FigmaNode;
    code: string | null;
    variables_defs: string | null;
    image: string | null;
}


export const FigmaInput = observer(({ isOpen, onOpenChange }: { 
    isOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
}) => {
    const [figmaUrl, setFigmaUrl] = useState('');
    const [internalIsOpen, setInternalIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    
    // Use external state if provided, otherwise use internal state
    const openState = isOpen ?? internalIsOpen;
    const setOpenState = onOpenChange ?? setInternalIsOpen;
    const editorEngine = useEditorEngine();

    const utils = api.useUtils();

    const buildDesignContent = (designData: FigmaDesignData, figmaUrl?: string, isSelection = false) => {
        const displayName = designData.node.name || (isSelection ? 'Figma Selection' : 'Figma Design');

        let content = `${isSelection ? 'Figma Selection' : 'Figma Design'}: ${displayName}\n`;
        content += `Type: ${designData.node.type}\n`;
        if (figmaUrl) {
            content += `URL: ${figmaUrl}\n`;
        }
        content += '\n';

        const successfulFeatures: string[] = [];

        // Adds code if available
        if (designData.code) {
            content += `Code (React/Tailwind):\n\`\`\`tsx\n${designData.code}\n\`\`\`\n\n`;
            successfulFeatures.push('React/Tailwind code');
        } else {
            successfulFeatures.push('Code (no data fetched)');
        }

        // Adds variables if available
        if (designData.variables_defs) {
            const varsData = typeof designData.variables_defs === 'string'
                ? designData.variables_defs
                : JSON.stringify(designData.variables_defs, null, 2);
            content += `Design Variables:\n\`\`\`json\n${varsData}\n\`\`\`\n\n`;
            successfulFeatures.push('Design variables');
        } else {
            successfulFeatures.push('Variables (no data fetched)');
        }

        // Adds image if available
        if (designData.image) {
            content += `Design Image:\n![Figma Design](data:image/png;base64,${designData.image})\n\n`;
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
            // Gets design data from URL using (server-side MCP)
            const result = await utils.figma.getDesignFromUrl.fetch({ figmaUrl: figmaUrl.trim() });

            if (result.success && result.data) {
                const designData = result.data;
                const { content, displayName } = buildDesignContent(designData, figmaUrl.trim(), false);

                // Adds to context
                editorEngine.chat.context.addFigmaContext(
                    figmaUrl.trim(),
                    result.nodeId ?? designData.node.id,
                    displayName,
                    content
                );

                toast.success(`Added Figma design: ${displayName}`);

                setFigmaUrl('');
                setOpenState(false);
            }
        } catch (error) {
            console.error('Error in handleAddFigmaUrl:', error);

            // Checks for connection failure
            const errorMessage = error instanceof Error ? error.message : null;
            if (errorMessage) {
                toast.error(errorMessage);
            } else {
                toast.error('Failed to add Figma design. Make sure Figma desktop app is running with MCP server enabled.');
            }
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
                    content
                );

                toast.success(`Added Figma selection: ${displayName}`);

                setOpenState(false);
            }
        } catch (error) {
            console.error('Error in handleAddCurrentSelection:', error);

            // Checks for connection failure
            const errorMessage = error instanceof Error ? error.message : null;
            if (errorMessage) {
                toast.error(errorMessage);
            } else {
                toast.error('Failed to add Figma design. Make sure Figma desktop app is running with MCP server enabled.');
            }
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
            if (text?.includes('figma.com')) {
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
        <Dialog open={openState} onOpenChange={setOpenState}>
            <DialogContent className="max-w-md"
                onClick={(e) => e.stopPropagation()}
            >
                <DialogHeader>
                    <DialogTitle>Import a Figma Design</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="flex items-start gap-2 p-3 rounded-md border border-border bg-muted/50 text-sm text-foreground-secondary select-none">
                        <Icons.InfoCircled className="w-4 h-4 mt-0.5 flex-shrink-0 text-foreground-secondary" />
                        <p className="text-sm">Need help? <a href="https://docs.onlook.com/docs/features/figma-to-onlook" target="_blank" rel="noopener noreferrer" className="text-foreground-primary underline">Learn how to import</a>.</p>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <div className="flex gap-2 mt-0">
                                <Input
                                    id="figma-url"
                                    placeholder="https://www.figma.com/file/..."
                                    value={figmaUrl}
                                    onChange={(e) => setFigmaUrl(e.target.value)}
                                    className="text-xs"
                                />
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handlePasteFromClipboard}
                                            className="px-2 h-9 hover:text-foreground-primary text-foreground-secondary"
                                        >
                                            <Icons.Clipboard className="w-3 h-3" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Paste from clipboard</TooltipContent>
                                </Tooltip>
                            </div>
                        </div>

                        <Button
                            onClick={handleAddFigmaUrl}
                            disabled={!figmaUrl.trim() || isLoading}
                            className="w-full text-xs h-9"
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

                        <div className="flex items-center gap-4">
                            <div className="flex-1 border-t border-border"></div>
                            <span className="text-xs text-foreground-tertiary select-none">or</span>
                            <div className="flex-1 border-t border-border"></div>
                        </div>

                        <Button
                            onClick={handleAddCurrentSelection}
                            disabled={isLoading}
                            variant="outline"
                            className="w-full text-xs h-9"
                            size="sm"
                        >
                            {isLoading ? (
                                <>
                                    <Icons.Shadow className="w-3 h-3 mr-2 animate-spin" />
                                    Fetching selection...
                                </>
                            ) : (
                                'Add Selected Frame from Figma'
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
});