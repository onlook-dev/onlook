import { invokeMainChannel } from '@/lib/utils';
import { MainChannels } from '@onlook/models/constants';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons/index';
import { Input } from '@onlook/ui/input';
import { getValidUrl } from '@onlook/utility';

export const UrlSection = ({ url }: { url: string }) => {
    const openUrl = () => {
        const lintedUrl = getValidUrl(url);
        invokeMainChannel(MainChannels.OPEN_EXTERNAL_WINDOW, lintedUrl);
    };

    return (
        <div className="flex flex-row items-center justify-between gap-2">
            <Input className="bg-background-secondary w-full" value={url} disabled={true} />
            <Button onClick={openUrl} variant="outline" size="icon">
                <Icons.ExternalLink className="h-4 w-4" />
            </Button>
        </div>
    );
};
