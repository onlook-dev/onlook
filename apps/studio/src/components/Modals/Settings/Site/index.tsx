import { useEditorEngine, useProjectsManager } from '@/components/Context';
import { useMetadataForm } from '@/hooks/useMetadataForm';
import { DefaultSettings, type PageMetadata } from '@onlook/models';
import { toast } from '@onlook/ui/use-toast';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { MetadataForm } from './MetadataForm';

export const SiteTab = observer(() => {
    const editorEngine = useEditorEngine();
    const projectsManager = useProjectsManager();
    const project = projectsManager.project;
    const siteSetting = project?.metadata;

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
        initialMetadata: siteSetting ?? undefined,
    });

    const [uploadedFavicon, setUploadedFavicon] = useState<File | null>(null);

    const handleFaviconSelect = (file: File) => {
        setUploadedFavicon(file);
        setIsDirty(true);
    };

    const handleSave = async () => {
        if (!project) {
            return;
        }
        try {
            const updatedMetadata: PageMetadata = {
                ...siteSetting,
                title,
                description,
            };

            if (!siteSetting?.metadataBase) {
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

            if (uploadedFavicon) {
                await editorEngine.image.upload(uploadedFavicon);
                const faviconPath = `/${DefaultSettings.IMAGE_FOLDER.replace(/^public\//, '')}/${uploadedFavicon.name}`;
                updatedMetadata.icons = {
                    icon: faviconPath,
                };
            }
            if (uploadedImage) {
                await editorEngine.image.upload(uploadedImage);
                const imagePath = `/${DefaultSettings.IMAGE_FOLDER.replace(/^public\//, '')}/${uploadedImage.name}`;
                updatedMetadata.openGraph = {
                    ...updatedMetadata.openGraph,
                    title: title,
                    description: description,
                    url: project?.url || '',
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

            projectsManager.updatePartialProject({
                ...project,
                metadata: updatedMetadata,
            });

            await editorEngine.pages.updateMetadataPage('/', updatedMetadata);
            setUploadedFavicon(null);
            setIsDirty(false);
            toast({
                title: 'Success',
                description: 'Site metadata has been updated successfully.',
            });
        } catch (error) {
            console.error('Failed to update metadata:', error);
            toast({
                title: 'Error',
                description: 'Failed to update site metadata. Please try again.',
                variant: 'destructive',
            });
        }
    };

    return (
        <div className="text-sm">
            <div className="flex flex-col gap-2 p-6">
                <h2 className="text-lg">Site Settings</h2>
            </div>
            <MetadataForm
                title={title}
                description={description}
                isDirty={isDirty}
                projectUrl={project?.domains?.base?.url ?? project?.url}
                onTitleChange={handleTitleChange}
                onDescriptionChange={handleDescriptionChange}
                onImageSelect={handleImageSelect}
                onFaviconSelect={handleFaviconSelect}
                onDiscard={handleDiscard}
                onSave={handleSave}
                showFavicon={true}
                currentMetadata={siteSetting ?? undefined}
            />
        </div>
    );
});
