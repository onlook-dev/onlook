import { useEditorEngine, useProjectsManager } from '@/components/Context';
import { DefaultSettings, type Metadata } from '@onlook/models';
import { memo } from 'react';
import { useMetadataForm } from '@/hooks/useMetadataForm';
import { MetadataForm } from './MetadataForm';
import { toast } from '@onlook/ui/use-toast';

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
        setIsDirty,
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
                openGraph: {
                    ...metadata?.openGraph,
                    title: title,
                    description: description,
                    url: project.domains?.base?.url || '',
                    siteName: title,
                    type: 'website',
                },
            };

            if (!metadata?.metadataBase) {
                const baseUrl = project.domains?.base?.url;
                if (baseUrl) {
                    const url = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;
                    updatedMetadata.metadataBase = new URL(url);
                } else if (project.url) {
                    const url = project.url.startsWith('http')
                        ? project.url
                        : `https://${project.url}`;
                    updatedMetadata.metadataBase = new URL(url);
                }
            }

            if (uploadedImage) {
                let imagePath;
                try {
                    await editorEngine.image.upload(uploadedImage);
                    imagePath = `/${DefaultSettings.IMAGE_FOLDER.replace(/^public\//, '')}/${uploadedImage.name}`;
                } catch (error) {
                    console.log(error);
                    return;
                }
                updatedMetadata.openGraph = {
                    ...updatedMetadata.openGraph,
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

            await editorEngine.pages.updateMetadataPage(path, updatedMetadata);
            setIsDirty(false);
            toast({
                title: 'Success',
                description: 'Page metadata has been updated successfully.',
            });
        } catch (error) {
            console.error('Failed to update metadata:', error);
            toast({
                title: 'Error',
                description: 'Failed to update page metadata. Please try again.',
                variant: 'destructive',
            });
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
