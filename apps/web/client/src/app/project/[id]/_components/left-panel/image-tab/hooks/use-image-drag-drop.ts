import { useEditorEngine } from '@/components/store/editor';
import { EditorMode, type ImageContentData } from '@onlook/models';
import { usePostHog } from 'posthog-js/react';
import { useCallback, useState } from 'react';
import { useImagesContext } from '../providers/images-provider';

export const useImageDragDrop = (currentFolder?: string) => {
    const editorEngine = useEditorEngine();
    const posthog = usePostHog();
    const { uploadOperations } = useImagesContext();

    const [isDragging, setIsDragging] = useState(false);

    const handleDrop = useCallback(
        async (e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault();

            setIsDragging(false);
            e.currentTarget.removeAttribute('data-dragging-image');

            try {
                const items = Array.from(e.dataTransfer.items);
                const imageFiles = items
                    .filter((item) => item.type.startsWith('image/'))
                    .map((item) => item.getAsFile())
                    .filter((file): file is File => file !== null);

                if (!currentFolder) {
                    throw new Error('No current folder');
                }

                for (const file of imageFiles) {
                    await uploadOperations.uploadImage(file, currentFolder);
                }
            } catch (error) {
                console.error(error);
            }
        },
        [uploadOperations],
    );

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

            editorEngine.state.editorMode = EditorMode.INSERT_IMAGE;
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
        editorEngine.state.editorMode = EditorMode.INSERT_IMAGE;
    }, [editorEngine.state]);

    const onImageMouseUp = useCallback(() => {
        editorEngine.state.editorMode = EditorMode.DESIGN;
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

    return {
        isDragging,
        handleDrop,
        handleDragOver,
        handleDragEnter,
        handleDragLeave,
        onImageDragStart,
        onImageMouseDown,
        onImageMouseUp,
        onImageDragEnd,
    };
}; 