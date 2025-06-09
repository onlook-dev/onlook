import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons/index';
import { Input } from '@onlook/ui/input';
import { getValidUrl } from '@onlook/utility';
import { toast } from '@onlook/ui/sonner';

export const UrlSection = ({ url, isCopyable }: { url: string, isCopyable: boolean }) => {
    const openUrl = () => {
        const lintedUrl = getValidUrl(url);
        window.open(lintedUrl, '_blank');
    };

    const copyUrl = () => {
        navigator.clipboard.writeText(url);
        toast.success('Copied to clipboard');
    };

    return (
        <div className="flex flex-row items-center justify-between gap-2">
            <Input className="bg-background-secondary w-full text-sm" value={url} disabled={true} />
            {isCopyable ? (
                <Button onClick={copyUrl} variant="outline" size="icon">
                    <Icons.Copy className="h-4 w-4" />
                </Button>
            ): (
                <Button onClick={openUrl} variant="outline" size="icon">
                    <Icons.ExternalLink className="h-4 w-4" />
                </Button>
            )}
        </div>
    );
};
