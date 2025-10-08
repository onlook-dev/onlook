import { useFile } from '@onlook/file-system/hooks';
import { type LocalImageMessageContext, MessageContextType } from '@onlook/models/chat';
import { Icons } from '@onlook/ui/icons';
import { motion } from 'motion/react';
import React, { useEffect, useState } from 'react';
import { getTruncatedName } from './helpers';
import { useEditorEngine } from '@/components/store/editor';

export const LocalImagePill = React.forwardRef<
    HTMLDivElement,
    {
        context: LocalImageMessageContext;
        onRemove: () => void;
    }
>(({ context, onRemove }, ref) => {
    const editorEngine = useEditorEngine();
    const projectId = editorEngine.projectId;
    const { content, loading } = useFile(projectId, context.branchId, context.path);
    const [imageUrl, setImageUrl] = useState<string | null>(null);

    if (context.type !== MessageContextType.LOCAL_IMAGE) {
        console.warn('LocalImagePill received non-local-image context');
        return null;
    }

    // Convert content to data URL for display
    useEffect(() => {
        if (!content) {
            setImageUrl(null);
            return;
        }

        // Handle SVG files (text content)
        if (typeof content === 'string' && context.displayName.toLowerCase().endsWith('.svg')) {
            const svgDataUrl = `data:image/svg+xml;base64,${btoa(content)}`;
            setImageUrl(svgDataUrl);
            return;
        }

        // Handle other text files (shouldn't happen for images, but just in case)
        if (typeof content === 'string') {
            setImageUrl(null);
            return;
        }

        // Handle binary content (PNG, JPG, etc.)
        const blob = new Blob([content as BlobPart], { type: context.mimeType || 'image/*' });
        const url = URL.createObjectURL(blob);
        setImageUrl(url);

        // Clean up function to revoke object URL (only for blob URLs)
        return () => {
            URL.revokeObjectURL(url);
        };
    }, [content, context.mimeType, context.displayName]);

    return (
        <motion.span
            layout="position"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{
                duration: 0.2,
                layout: {
                    duration: 0.15,
                    ease: 'easeOut',
                },
            }}
            className="group relative flex flex-row items-center gap-1 justify-center border bg-background-tertiary rounded-md h-7"
            key={context.displayName}
            ref={ref}
        >
            {/* Left side: Image thumbnail */}
            <div className="w-7 h-7 flex items-center justify-center overflow-hidden relative">
                {loading ? (
                    <Icons.Reload className="w-3 h-3 animate-spin text-foreground-secondary" />
                ) : imageUrl ? (
                    <img
                        src={imageUrl}
                        alt={context.displayName}
                        className="w-full h-full object-cover rounded-l-md"
                    />
                ) : (
                    <Icons.Image className="w-3 h-3 text-foreground-secondary" />
                )}
                <div className="absolute inset-0 border-l-[1px] border-y-[1px] rounded-l-md border-white/10 pointer-events-none" />
            </div>

            {/* Right side: Filename */}
            <span className="text-xs overflow-hidden whitespace-nowrap text-ellipsis max-w-[100px] pr-1">
                {getTruncatedName(context)}
            </span>

            {/* Hover X button */}
            <button
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onRemove();
                }}
                className="absolute -top-1.5 -right-1.5 w-6 h-6 p-1 rounded-full bg-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
            >
                <Icons.CrossL className="w-2.5 h-2.5 text-primary-foreground" />
            </button>
        </motion.span>
    );
});

LocalImagePill.displayName = 'LocalImagePill';
