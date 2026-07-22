import { useEditorEngine } from '@/components/store/editor';
import { DefaultSettings } from '@onlook/constants';
import type { ImageMessageContext, MessageContext } from '@onlook/models/chat';
import { MessageContextType } from '@onlook/models/chat';
import { toast } from '@onlook/ui/sonner';
import { assertNever, sanitizeFilename } from '@onlook/utility';
import { observer } from 'mobx-react-lite';
import { AnimatePresence } from 'motion/react';
import { useMemo } from 'react';
import { DraftContextPill } from './draft-context-pill';
import { ImagePill } from './image-pill';

const typeOrder = {
    [MessageContextType.BRANCH]: 0,
    [MessageContextType.FILE]: 1,
    [MessageContextType.HIGHLIGHT]: 2,
    [MessageContextType.ERROR]: 3,
    [MessageContextType.AGENT_RULE]: 4,
    [MessageContextType.IMAGE]: 5,
};

const mimeExtensionMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/svg+xml': 'svg',
    'image/bmp': 'bmp',
    'image/x-icon': 'ico',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
};

const getExtensionFromMimeType = (mimeType: string) => {
    return mimeExtensionMap[mimeType] ?? 'png';
};

const getSanitizedFileName = (displayName: string, mimeType: string) => {
    const sanitizedName = sanitizeFilename(displayName || `chat-image-${Date.now()}`);
    if (sanitizedName.includes('.')) {
        return sanitizedName;
    }
    const extension = getExtensionFromMimeType(mimeType);
    return `${sanitizedName}.${extension}`;
};

const getStableKey = (context: MessageContext, index: number): string => {
    switch (context.type) {
        case MessageContextType.FILE:
            return `file-${context.path}-${context.branchId}`;
        case MessageContextType.HIGHLIGHT:
            return `highlight-${context.path}-${context.start}-${context.end}-${context.branchId}`;
        case MessageContextType.IMAGE:
            return `image-${context.id || index}`;
        case MessageContextType.BRANCH:
            return `branch-${context.branch.id}`;
        case MessageContextType.ERROR:
            return `error-${context.branchId}`;
        case MessageContextType.AGENT_RULE:
            return `agent-rule-${context.path}`;
        default:
            assertNever(context);
    }
};

export const InputContextPills = observer(() => {
    const editorEngine = useEditorEngine();

    const handleRemoveContext = (contextToRemove: MessageContext) => {
        const newContext = [...editorEngine.chat.context.context].filter(
            (context) => context !== contextToRemove,
        );
        editorEngine.chat.context.context = newContext;
    };

    const handleSaveImageContext = async (imageContext: ImageMessageContext) => {
        if (imageContext.source === 'local' && imageContext.path) {
            toast.success('Image already exists in project assets');
            return;
        }

        try {
            const destinationFolder = `${DefaultSettings.IMAGE_FOLDER}/images`;
            const fileName = getSanitizedFileName(imageContext.displayName, imageContext.mimeType);

            let targetPath = `${destinationFolder}/${fileName}`;
            let counter = 1;

            while (await editorEngine.activeSandbox.fileExists(targetPath)) {
                const lastDotIndex = fileName.lastIndexOf('.');
                const baseName =
                    lastDotIndex > 0 ? fileName.slice(0, lastDotIndex) : fileName;
                const extension =
                    lastDotIndex > 0 ? fileName.slice(lastDotIndex) : '';
                targetPath = `${destinationFolder}/${baseName}-${counter}${extension}`;
                counter += 1;
            }

            const imageResponse = await fetch(imageContext.content);
            const imageBuffer = await imageResponse.arrayBuffer();
            const imageData = new Uint8Array(imageBuffer);

            await editorEngine.activeSandbox.writeFile(targetPath, imageData);

            const savedImageName = targetPath.split('/').pop() ?? fileName;
            const updatedImageContext: ImageMessageContext = {
                ...imageContext,
                source: 'local',
                path: targetPath,
                branchId: editorEngine.branches.activeBranch.id,
                displayName: savedImageName,
            };

            editorEngine.chat.context.context = editorEngine.chat.context.context.map((context) =>
                context === imageContext ? updatedImageContext : context,
            );

            toast.success(`Saved image to ${targetPath}`);
        } catch (error) {
            console.error('Failed to save image to project assets:', error);
            toast.error('Failed to save image to project assets');
        }
    };

    const sortedContexts = useMemo(() => {
        return [...editorEngine.chat.context.context]
            .sort((a, b) => {
                return typeOrder[a.type] - typeOrder[b.type];
            });
    }, [editorEngine.chat.context.context]);

    return (
        <div className="flex flex-row flex-wrap items-center gap-1.5 px-1 pt-1">
            <AnimatePresence mode="popLayout">
                {sortedContexts.map((context: MessageContext, index: number) => {
                    const key = getStableKey(context, index);

                    if (context.type === MessageContextType.IMAGE) {
                        return (
                            <ImagePill
                                key={key}
                                context={context as ImageMessageContext}
                                onSave={() => void handleSaveImageContext(context as ImageMessageContext)}
                                onRemove={() => handleRemoveContext(context)}
                            />
                        );
                    }
                    return (
                        <DraftContextPill
                            key={key}
                            context={context}
                            onRemove={() => handleRemoveContext(context)}
                        />
                    );
                })}
            </AnimatePresence>
        </div>
    );
});
