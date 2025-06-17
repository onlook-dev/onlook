import { useEditorEngine } from '@/components/store/editor';
import { useDomainsManager, useProjectManager } from '@/components/store/project';
import { type PageMetadata } from '@onlook/models';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { DefaultSettings } from '@onlook/constants';
import { useMetadataForm } from './use-metadata-form';
import { toast } from '@onlook/ui/sonner';
import { MetadataForm } from './metadata-form';

export const SiteTab = observer(() => {
    const editorEngine = useEditorEngine();
    const projectsManager = useProjectManager();
    const domainsManager = useDomainsManager()
    const project = projectsManager.project;
    const siteSetting = project?.metadata;
    const baseUrl = domainsManager.domains.preview?.url ?? domainsManager.domains.custom?.url ?? project?.sandbox.url;

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
                const url = baseUrl?.startsWith('http') ? baseUrl : `https://${baseUrl}`;
                if (url) {
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
                    url: baseUrl || '',
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
                siteMetadata: updatedMetadata,
            });

            await editorEngine.pages.updateMetadataPage('/', updatedMetadata);
            setUploadedFavicon(null);
            setIsDirty(false);
            toast.success('Site metadata has been updated successfully.', {
            });
        } catch (error) {
            console.error('Failed to update metadata:', error);
            toast.error('Failed to update site metadata. Please try again.', {
                description: 'Failed to update site metadata. Please try again.',
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
                projectUrl={baseUrl}
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