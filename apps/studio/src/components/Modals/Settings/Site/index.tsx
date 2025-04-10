import { useEditorEngine, useProjectsManager } from '@/components/Context';
import { observer } from 'mobx-react-lite';
import { DefaultSettings, type Metadata } from '@onlook/models';
import { useMetadataForm } from '@/hooks/useMetadataForm';
import { MetadataForm } from './MetadataForm';
import { useState } from 'react';

const DEFAULT_TITLE = 'Saved Places - Discover new spots';
const DEFAULT_DESCRIPTION =
    'This is the information that will show up on search engines below your page title.';

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
        initialMetadata: siteSetting,
        defaultTitle: DEFAULT_TITLE,
        defaultDescription: DEFAULT_DESCRIPTION,
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
            const updatedMetadata: Metadata = {
                ...siteSetting,
                title,
                description,
            };

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

            await editorEngine.pages.updateMetadataPage('layout.tsx', updatedMetadata, true);
            setUploadedFavicon(null);
        } catch (error) {
            console.error('Failed to update metadata:', error);
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
                currentMetadata={siteSetting}
                defaultTitle={DEFAULT_TITLE}
                defaultDescription={DEFAULT_DESCRIPTION}
            />
        </div>
    );
});
