import { useEditorEngine } from '@/components/store/editor';
import { api } from '@/trpc/react';
import { DefaultSettings } from '@onlook/constants';
import { type PageMetadata } from '@onlook/models';
import { toast } from '@onlook/ui/sonner';
import { observer } from 'mobx-react-lite';
import { useMemo, useState } from 'react';
import { MetadataForm } from './metadata-form';
import { useMetadataForm } from './use-metadata-form';

export const SiteTab = observer(() => {
    const editorEngine = useEditorEngine();
    const { data: domains } = api.domain.getAll.useQuery({ projectId: editorEngine.projectId });
    const baseUrl = domains?.published?.url ?? domains?.preview?.url;

    const homePage = useMemo(() => {
        return editorEngine.pages.tree.find((page) => page.path === '/');
    }, [editorEngine.pages.tree]);

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
        initialMetadata: homePage?.metadata ?? {}
    });

    const [uploadedFavicon, setUploadedFavicon] = useState<File | null>(null);

    const handleFaviconSelect = (file: File) => {
        setUploadedFavicon(file);
        setIsDirty(true);
    };

    const handleSave = async () => {
        try {
            const url = baseUrl?.startsWith('http') ? baseUrl : `https://${baseUrl}`;

            const updatedMetadata: PageMetadata = {
                ...homePage?.metadata ?? {},
                title,
                description,
                openGraph: {
                    ...homePage?.metadata?.openGraph,
                    title: title,
                    description: description,
                    url: baseUrl || '',
                    siteName: title,
                    type: 'website',
                },
            };

            if (!homePage?.metadata?.metadataBase) {
                if (url) {
                    updatedMetadata.metadataBase = new URL(url);
                }
            }

            if (uploadedFavicon) {
                let faviconPath;
                try {
                    await editorEngine.image.upload(uploadedFavicon, DefaultSettings.IMAGE_FOLDER);
                    faviconPath = `/${uploadedFavicon.name}`;
                } catch (error) {
                    toast.error('Failed to upload favicon. Please try again.');
                    return;
                }
                updatedMetadata.icons = {
                    icon: faviconPath,
                };
            }
            if (uploadedImage) {
                let imagePath;
                try {
                    await editorEngine.image.upload(uploadedImage, DefaultSettings.IMAGE_FOLDER);
                    imagePath = `/${uploadedImage.name}`;
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
                currentMetadata={homePage?.metadata ?? {}}
            />
        </div>
    );
});