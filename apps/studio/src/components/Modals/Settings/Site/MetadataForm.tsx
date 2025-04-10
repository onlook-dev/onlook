import { Input } from '@onlook/ui/input';
import { Separator } from '@onlook/ui/separator';
import { Textarea } from '@onlook/ui/textarea';
import { Button } from '@onlook/ui/button';
import type { Metadata, OGImage } from '@onlook/models';
import ImagePicker from './Image';
import { Favicon } from './Favicon';

const getImageUrl = (images: OGImage | OGImage[] | undefined): string | undefined => {
    if (!images) {
        return undefined;
    }
    const image = Array.isArray(images) ? images[0] : images;
    if (typeof image === 'string') {
        return image;
    }
    if (image instanceof URL) {
        return image.toString();
    }
    return image.url?.toString();
};

interface MetadataFormProps {
    title: string;
    description: string;
    isDirty: boolean;
    projectUrl?: string;
    onTitleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onDescriptionChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    onImageSelect: (file: File) => void;
    onFaviconSelect?: (file: File) => void;
    onDiscard: () => void;
    onSave: () => void;
    showFavicon?: boolean;
    currentMetadata?: Metadata;
    defaultTitle?: string;
    defaultDescription?: string;
}

export const MetadataForm = ({
    title,
    description,
    isDirty,
    projectUrl,
    onTitleChange,
    onDescriptionChange,
    onImageSelect,
    onFaviconSelect,
    onDiscard,
    onSave,
    showFavicon = false,
    currentMetadata,
    defaultTitle = 'Title',
    defaultDescription = 'This is the information that will show up on search engines below your page title.',
}: MetadataFormProps) => {
    return (
        <div className="text-sm">
            <div className="flex flex-col gap-6 p-6">
                <div className="grid grid-cols-2 text-foreground-onlook">
                    <div className="flex items-center">
                        <h2 className="text-regular font-medium">Site Title</h2>
                    </div>
                    <Input
                        placeholder="Site Title"
                        value={title}
                        className="col-span-1 text-miniPlus break-words transition-all duration-150 ease-in-out backdrop-blur-lg bg-background-secondary/75 text-foreground-primary border-background-secondary/75"
                        onChange={onTitleChange}
                    />
                </div>

                <div className="grid grid-cols-2 h-44">
                    <div className="flex flex-col text-foreground-onlook col-span-1 max-w-52">
                        <h2 className="text-regular font-medium">Page Description</h2>
                        <p className="text-small">{defaultDescription}</p>
                    </div>

                    <Textarea
                        placeholder={defaultDescription}
                        value={description}
                        className="col-span-1 text-miniPlus break-words transition-all duration-150 ease-in-out backdrop-blur-lg bg-background-secondary/75 text-foreground-primary border-background-secondary/75"
                        onChange={onDescriptionChange}
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
                        <p className="text-miniPlus text-blue-500">{projectUrl}</p>
                        <h3 className="text-regular">{title || defaultTitle}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                            {description || defaultDescription}
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
                                onImageSelect={onImageSelect}
                                url={getImageUrl(currentMetadata?.openGraph?.images)}
                            />
                        </div>
                    </div>
                    {showFavicon && (
                        <div className="grid grid-cols-2">
                            <div className="text-gray-200 max-w-52">
                                <p className="text-regular font-medium">Favicon</p>
                                <p className="text-small">
                                    This is the small icon that shows up in search engines and in
                                    your browser. It should be 64 × 64 pixels.
                                </p>
                            </div>
                            <Favicon
                                onImageSelect={onFaviconSelect!}
                                url={currentMetadata?.icons?.icon?.toString()}
                            />
                        </div>
                    )}
                    <div className="flex justify-end gap-4">
                        <Button
                            variant="ghost"
                            className="flex items-center gap-2 px-4 py-0"
                            type="button"
                            onClick={onDiscard}
                            disabled={!isDirty}
                        >
                            <span>Discard changes</span>
                        </Button>
                        <Button
                            variant="secondary"
                            className="flex items-center gap-2 px-4 py-0 backdrop-blur-sm rounded border border-foreground-tertiary/20"
                            type="button"
                            onClick={onSave}
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
};
