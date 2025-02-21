import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Separator } from '@onlook/ui/separator';
import { observer } from 'mobx-react-lite';

export const PublishDropdown = observer(() => {
    return (
        <div className="rounded-md flex flex-col p-4 text-foreground-secondary gap-2">
            <BaseDomainSection />
            <Separator />
            <CustomDomainSection />
            <Separator />
            <div className="flex flex-row items-center gap-2">
                <Icons.Gear className="h-4 w-4" />
                Advanced Settings
                <Icons.ChevronRight className="ml-auto h-4 w-4" />
            </div>
        </div>
    );
});

export const BaseDomainSection = observer(() => {
    return (
        <div className="flex flex-col items-center justify-between gap-2">
            <h2 className="text-start w-full">Publish</h2>
            <Button className="w-full rounded-md p-3 mb-4">Publish my site</Button>
        </div>
    );
});

export const CustomDomainSection = observer(() => {
    return (
        <div className="flex flex-col items-center gap-2">
            <div className="flex items-center w-full">
                <h3 className="">Custom Domain</h3>
                <span className="ml-auto rounded bg-blue-400 text-white px-1.5 py-0.5 text-xs">
                    PRO
                </span>
            </div>

            <Button className="w-full rounded-md p-3 mb-4 bg-blue-400">Link a Custom Domain</Button>
        </div>
    );
});
