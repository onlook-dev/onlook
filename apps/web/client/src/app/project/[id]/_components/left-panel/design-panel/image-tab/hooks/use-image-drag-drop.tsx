import { useEditorEngine } from '@/components/store/editor';
import { EditorMode, InsertMode, type ImageContentData } from '@onlook/models';
import { usePostHog } from 'posthog-js/react';
import { useCallback, useState } from 'react';

export const useImageDragDrop = (onUpload?: (files: FileList) => Promise<void>) => {
    const editorEngine = useEditorEngine();
    const posthog = usePostHog();
    const [isDragging, setIsDragging] = useState(false);


    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    }, []);

    const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        handleDragStateChange(true, e);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            handleDragStateChange(false, e);
        }
    }, []);

    const handleDragStateChange = useCallback(
        (isDragging: boolean, e: React.DragEvent<HTMLDivElement>) => {
            const hasImage =
                e.dataTransfer.types.length > 0 &&
                Array.from(e.dataTransfer.items).some(
                    (item) =>
                        item.type.startsWith('image/') ||
                        (item.type === 'Files' && e.dataTransfer.types.includes('public.file-url')),
                );
            if (hasImage) {
                setIsDragging(isDragging);
                e.currentTarget.setAttribute('data-dragging-image', isDragging.toString());
            }
        },
        [],
    );

    const onImageDragStart = useCallback(
        (e: React.DragEvent<HTMLDivElement>, image: ImageContentData) => {
            e.dataTransfer.setData(
                'application/json',
                JSON.stringify({
                    type: 'image',
                    fileName: image.fileName,
                    content: image.content,
                    mimeType: image.mimeType,
                    originPath: image.originPath,
                }),
            );

            editorEngine.state.insertMode = InsertMode.INSERT_IMAGE;
            for (const frame of editorEngine.frames.getAll()) {
                if (!frame.view) {
                    console.error('No frame view found');
                    continue;
                }
                frame.view.style.pointerEvents = 'none';
            }
            posthog.capture('image_drag_start');
        },
        [],
    );

    const onImageMouseDown = useCallback(() => {
        editorEngine.state.insertMode = InsertMode.INSERT_IMAGE;
    }, [editorEngine.state]);

    const onImageMouseUp = useCallback(() => {
        editorEngine.state.editorMode = EditorMode.DESIGN;
        editorEngine.state.insertMode = null;
    }, [editorEngine.state]);

    const onImageDragEnd = useCallback(() => {
        for (const frame of editorEngine.frames.getAll()) {
            if (!frame.view) {
                console.error('No frame view found');
                continue;
            }
            frame.view.style.pointerEvents = 'auto';
        }
        editorEngine.state.editorMode = EditorMode.DESIGN;
    }, []);

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        e.currentTarget.removeAttribute('data-dragging-image');

        const files = e.dataTransfer.files;
        if (files.length > 0 && onUpload) {
            void onUpload(files);
        }
    }, [onUpload]);

    return {
        isDragging,
        handleDragOver,
        handleDragEnter,
        handleDragLeave,
        handleDrop,
        onImageDragStart,
        onImageMouseDown,
        onImageMouseUp,
        onImageDragEnd,
    };
}; 