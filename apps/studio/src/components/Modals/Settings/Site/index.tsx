import { useEditorEngine, useProjectsManager } from '@/components/Context';
import { Input } from '@onlook/ui/input';
import { Separator } from '@onlook/ui/separator';
import { Textarea } from '@onlook/ui/textarea';
import { observer } from 'mobx-react-lite';
import ImagePicker from './Image';
import { useEffect, useState } from 'react';
import type { Metadata } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import { DefaultSettings } from '@onlook/models/constants';
import { Favicon } from './Favicon';

const DEFAULT_TITLE = 'Saved Places - Discover new spots';
const DEFAULT_DESCRIPTION =
    'This is the information that will show up on search engines below your page title.';

export const SiteTab = observer(() => {
    const editorEngine = useEditorEngine();
    const projectsManager = useProjectsManager();
    const project = projectsManager.project;
    const siteSetting = project?.metadata;

    const [title, setTitle] = useState(siteSetting?.title || DEFAULT_TITLE);
    const [description, setDescription] = useState(siteSetting?.description || DEFAULT_DESCRIPTION);
    const [isDirty, setIsDirty] = useState(false);
    const [uploadedFavicon, setUploadedFavicon] = useState<File | null>(null);
    const [uploadedImage, setUploadedImage] = useState<File | null>(null);

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTitle(e.target.value);
        setIsDirty(true);
    };

    const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setDescription(e.target.value);
        setIsDirty(true);
    };

    const handleDiscard = () => {
        setTitle(siteSetting?.title || DEFAULT_TITLE);
        setDescription(siteSetting?.description || DEFAULT_DESCRIPTION);
        setUploadedFavicon(null);
        setUploadedImage(null);
        setIsDirty(false);
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

            // Upload images if any and update metadata with their paths
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

            setIsDirty(false);
            setUploadedFavicon(null);
            setUploadedImage(null);
        } catch (error) {
            console.error('Failed to update metadata:', error);
        }
    };

    useEffect(() => {
        if (siteSetting) {
            setTitle(siteSetting?.title ?? DEFAULT_TITLE);
            setDescription(siteSetting.description ?? DEFAULT_DESCRIPTION);
        }
    }, [siteSetting]);

    const onFaviconUpload = (file: File) => {
        setUploadedFavicon(file);
        setIsDirty(true);
    };

    const onImageUpload = (file: File) => {
        setUploadedImage(file);
        setIsDirty(true);
    };

    return (
        <div className="text-sm">
            <div className="flex flex-col gap-6 p-6">
                <div className="flex flex-col gap-2">
                    <h2 className="text-lg">Site Settings</h2>
                </div>
                <Separator />

                <div className="grid grid-cols-2 text-foreground-onlook">
                    <div className="flex items-center">
                        <h2 className="text-regular font-medium">Site Title</h2>
                    </div>
                    <Input
                        value={title}
                        className="col-span-1 text-small"
                        onChange={handleTitleChange}
                    />
                </div>

                <div className="grid grid-cols-2 h-44">
                    <div className="flex flex-col text-foreground-onlook col-span-1 max-w-52">
                        <h2 className="text-regular font-medium">Page Description</h2>
                        <p className="text-small">
                            This is the information that will show up on search engines below your
                            page title.
                        </p>
                    </div>

                    <Textarea
                        value={description}
                        className="col-span-1 text-miniPlus break-words transition-all duration-150 ease-in-out backdrop-blur-lg bg-background-secondary/75 text-foreground-primary border-background-secondary/75"
                        onChange={handleDescriptionChange}
                        style={{
                            resize: 'none',
                            height: 'auto',
                            overflowY: 'auto',
                            overflowX: 'hidden',
                            overscrollBehavior: 'contain',
                            lineHeight: '1.5',
                        }}
                    />
                </div>

                <div className="flex flex-col gap-2">
                    <h2 className="text-regular text-foreground-onlook">Search Engine Preview</h2>
                    <div className="bg-background/50 p-4 rounded-md border gap-1.5 flex flex-col">
                        <p className="text-miniPlus text-blue-500">
                            {project?.domains?.base?.url ?? project?.url}
                        </p>
                        <h3 className="text-regular">{title || DEFAULT_TITLE}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                            {description || DEFAULT_DESCRIPTION}
                        </p>
                    </div>
                </div>
                <Separator />

                <div className="flex flex-col gap-4">
                    <h2 className="text-title3">Imagery</h2>
                    <div className="grid grid-cols-2 text-foreground-onlook">
                        <div className="flex flex-col max-w-52">
                            <p className="text-regular font-medium">Social Preview</p>
                            <p className="text-small">Cropped to 1200 × 630 pixels</p>
                        </div>
                        <div>
                            <ImagePicker
                                onImageSelect={onImageUpload}
                                url={siteSetting?.openGraph?.images?.[0]?.url}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2">
                        <div className="text-gray-200 max-w-52">
                            <p className="text-regular font-medium">Favicon</p>
                            <p className="text-small">
                                This is the small icon that shows up in search engines and in your
                                browser. It should be 64 × 64 pixels.
                            </p>
                        </div>
                        <Favicon onImageSelect={onFaviconUpload} url={siteSetting?.icons?.icon} />
                    </div>
                    <div className="flex justify-end gap-4">
                        <Button
                            variant="ghost"
                            className="flex items-center gap-2 px-4 py-0"
                            type="button"
                            onClick={handleDiscard}
                            disabled={!isDirty}
                        >
                            <span>Discard changes</span>
                        </Button>
                        <Button
                            variant="secondary"
                            className="flex items-center gap-2 px-4 py-0 backdrop-blur-sm rounded border border-foreground-tertiary/20"
                            type="button"
                            onClick={handleSave}
                            disabled={!isDirty}
                        >
                            <span>Save changes</span>
                        </Button>
                    </div>
                </div>
            </div>
            <Separator />
        </div>
    );
});
