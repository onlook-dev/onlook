import { useEditorEngine, useProjectsManager } from '@/components/Context';
import { DefaultSettings, type Metadata } from '@onlook/models';
import { memo } from 'react';
import { useMetadataForm } from '@/hooks/useMetadataForm';
import { MetadataForm } from './MetadataForm';

export const PageTab = memo(({ metadata, path }: { metadata?: Metadata; path: string }) => {
    const projectsManager = useProjectsManager();
    const editorEngine = useEditorEngine();
    const project = projectsManager.project;

    const {
        title,
        description,
        isDirty,
        uploadedImage,
        handleTitleChange,
        handleDescriptionChange,
        handleImageSelect,
        handleDiscard,
    } = useMetadataForm({
        initialMetadata: metadata,
    });

    const handleSave = async () => {
        if (!project) {
            return;
        }
        try {
            const updatedMetadata: Metadata = {
                ...metadata,
                title,
                description,
            };

            if (uploadedImage) {
                await editorEngine.image.upload(uploadedImage);
                const imagePath = `/${DefaultSettings.IMAGE_FOLDER.replace(/^public\//, '')}/${uploadedImage.name}`;
                updatedMetadata.metadataBase = new URL(project.domains?.base?.url ?? '');
                updatedMetadata.openGraph = {
                    ...updatedMetadata.openGraph,
                    title: title,
                    description: description,
                    url: project.domains?.base?.url || '',
                    siteName: title,
                    images: [
                        {
                            url: imagePath,
                            width: 1200,
                            height: 630,
                            alt: title,
                        },
                    ],
                    type: 'website',
                };
            }

            await editorEngine.pages.updateMetadataPage(path, updatedMetadata, false);
        } catch (error) {
            console.error('Failed to update metadata:', error);
        }
    };

    return (
        <div className="text-sm">
            <div className="flex flex-col gap-2 p-6">
                <h2 className="text-lg">Page Settings</h2>
            </div>
            <MetadataForm
                title={title}
                description={description}
                isDirty={isDirty}
                projectUrl={project?.domains?.base?.url ?? project?.url}
                onTitleChange={handleTitleChange}
                onDescriptionChange={handleDescriptionChange}
                onImageSelect={handleImageSelect}
                onDiscard={handleDiscard}
                onSave={handleSave}
                currentMetadata={metadata}
            />
        </div>
    );
});

PageTab.displayName = 'PageTab';
