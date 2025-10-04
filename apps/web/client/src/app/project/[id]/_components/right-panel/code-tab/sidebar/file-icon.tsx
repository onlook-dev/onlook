import { Icons } from "@onlook/ui/icons";

export const FileIcon = ({ path, isDirectory }: { path: string, isDirectory: boolean }) => {

    if (isDirectory) {
        return <Icons.Directory className="w-4 h-4 mr-2" />;
    }

    const fileName = path.split('/').pop() || path;
    const lastDotIndex = fileName.lastIndexOf('.');
    const extension = lastDotIndex > 0 ? fileName.slice(lastDotIndex + 1).toLowerCase() : '';

    switch (extension) {
        case 'js':
        case 'jsx':
        case 'ts':
        case 'tsx':
            return <Icons.Code className="w-4 h-4 mr-2" />;
        case 'css':
        case 'scss':
        case 'sass':
            return <Icons.Box className="w-4 h-4 mr-2" />;
        case 'html':
            return <Icons.Frame className="w-4 h-4 mr-2" />;
        case 'json':
            return <Icons.Code className="w-4 h-4 mr-2" />;
        case 'md':
        case 'mdx':
            return <Icons.Text className="w-4 h-4 mr-2" />;
        case 'jpg':
        case 'jpeg':
        case 'png':
        case 'gif':
        case 'svg':
            return <Icons.Image className="w-4 h-4 mr-2" />;
        default:
            return <Icons.File className="w-4 h-4 mr-2" />;
    }
};
