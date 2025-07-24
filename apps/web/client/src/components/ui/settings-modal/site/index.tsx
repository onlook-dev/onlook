import { useEditorEngine } from '@/components/store/editor';
import { api } from '@/trpc/react';
import { DefaultSettings } from '@onlook/constants';
import { type PageMetadata } from '@onlook/models';
import { Icons } from '@onlook/ui/icons';
import { toast } from '@onlook/ui/sonner';
import { createSecureUrl } from '@onlook/utility';
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
        titleObject,
        description,
        isDirty,
        uploadedImage,
        isSimpleTitle,
        handleTitleChange,
        handleTitleTemplateChange,
        handleTitleAbsoluteChange,
        handleDescriptionChange,
        handleImageSelect,
        handleDiscard,
        setIsDirty,
        getFinalTitleMetadata,
    } = useMetadataForm({
        initialMetadata: homePage?.metadata ?? {},
    });

    const [uploadedFavicon, setUploadedFavicon] = useState<File | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const handleFaviconSelect = (file: File) => {
        setUploadedFavicon(file);
        setIsDirty(true);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const url = createSecureUrl(baseUrl);
            const finalTitle = getFinalTitleMetadata();
            const siteTitle = typeof finalTitle === 'string' ? finalTitle : finalTitle.absolute ?? finalTitle.default ?? '';

            const updatedMetadata: PageMetadata = {
                ...(homePage?.metadata ?? {}),
                title: finalTitle,
                description,
                openGraph: {
                    ...homePage?.metadata?.openGraph,
                    title: siteTitle,
                    description: description,
                    url,
                    siteName: siteTitle,
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
                            alt: siteTitle,
                        },
                    ],
                    type: 'website',
                };
            }

            await editorEngine.pages.updateMetadataPage('/', updatedMetadata);
            setUploadedFavicon(null);
            setIsDirty(false);
            toast.success('Site metadata has been updated successfully.', {});
        } catch (error) {
            console.error('Failed to update metadata:', error);
            toast.error('Failed to update site metadata. Please try again.', {
                description: 'Failed to update site metadata. Please try again.',
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="text-sm">
            <div className="flex flex-col gap-2 p-6">
                <h2 className="text-lg">Site Settings</h2>
            </div>
            <div className="relative">
                {editorEngine.pages.isScanning ? (
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center">
                        <div className="flex items-center gap-3 text-foreground-secondary">
                            <Icons.LoadingSpinner className="h-5 w-5 animate-spin" />
                            <span className="text-sm">Fetching metadata...</span>
                        </div>
                    </div>
                ) : (
                    <MetadataForm
                        title={title}
                        titleObject={titleObject}
                        description={description}
                        isDirty={isDirty}
                        projectUrl={baseUrl}
                        isSimpleTitle={isSimpleTitle}
                        disabled={editorEngine.pages.isScanning}
                        isSaving={isSaving}
                        onTitleChange={handleTitleChange}
                        onTitleTemplateChange={handleTitleTemplateChange}
                        onTitleAbsoluteChange={handleTitleAbsoluteChange}
                        onDescriptionChange={handleDescriptionChange}
                        onImageSelect={handleImageSelect}
                        onFaviconSelect={handleFaviconSelect}
                        onDiscard={handleDiscard}
                        onSave={handleSave}
                        showFavicon={true}
                        currentMetadata={homePage?.metadata ?? {}}
                        isRoot={true}
                    />
                )}
            </div>
        </div>
    );
});
