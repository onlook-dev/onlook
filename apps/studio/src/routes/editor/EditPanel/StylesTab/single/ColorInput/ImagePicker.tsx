import { Icons } from '@onlook/ui/icons';

const ImagePickerContent: React.FC = () => {
    return (
        <div className="p-4 flex flex-col gap-2">
            <div className="aspect-video bg-background-secondary rounded-md flex items-center justify-center">
                <button className="flex items-center gap-2 text-foreground-secondary hover:text-foreground-primary">
                    <Icons.Image className="w-4 h-4" />
                    <span>Upload Image</span>
                </button>
            </div>
        </div>
    );
};

export default ImagePickerContent;
