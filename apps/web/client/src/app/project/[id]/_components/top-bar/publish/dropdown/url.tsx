import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons/index';
import { Input } from '@onlook/ui/input';
import { getValidUrl } from '@onlook/utility';
import { useState } from 'react';

export const UrlSection = ({ url, isCopyable }: { url: string, isCopyable: boolean }) => {
    const [isCopied, setIsCopied] = useState(false);
    const openUrl = () => {
        const lintedUrl = getValidUrl(url);
        window.open(lintedUrl, '_blank');
    };

    const copyUrl = () => {
        navigator.clipboard.writeText(url);
        setIsCopied(true);
        setTimeout(() => {
            setIsCopied(false);
        }, 2000);
    };

    return (
        <div className="flex flex-row items-center justify-between gap-2">
            <Input className="bg-background-secondary w-full text-xs" value={url} readOnly />
            {isCopyable ? (
                <Button onClick={copyUrl} variant="outline" size="icon">
                    {isCopied ? <Icons.Check className="h-4 w-4" /> : <Icons.Copy className="h-4 w-4" />}
                </Button>
            ) : (
                <Button onClick={openUrl} variant="outline" size="icon">
                    <Icons.ExternalLink className="h-4 w-4" />
                </Button>
            )}
        </div>
    );
};
