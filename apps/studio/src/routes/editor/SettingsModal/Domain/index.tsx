import { useEditorEngine, useUserManager } from '@/components/Context';
import { Separator } from '@onlook/ui/separator';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import BaseDomain from './Base';
// import { CustomDomain } from './Custom';

export const DomainTab = observer(() => {
    const userManager = useUserManager();
    const editorEngine = useEditorEngine();

    useEffect(() => {
        userManager.subscription.getPlanFromServer();
    }, [editorEngine.isSettingsOpen]);

    return (
        <div className="space-y-8">
            <BaseDomain />
            <Separator />
            {/* TODO: Uncomment after freestyle bug is fixed */}
            {/* <CustomDomain /> */}
            <Teaser />
        </div>
    );
});

const Teaser = () => {
    return (
        <div className="flex flex-col gap-4">
            <div className="text-sm flex items-center gap-2">
                <h2 className="text-lg font-medium">Custom Domain</h2>
                <span className="bg-blue-500 text-white px-2 py-0.5 rounded-full text-xs">
                    Coming Soon
                </span>
            </div>

            <div className="text-sm text-muted-foreground flex items-center gap-2">
                <span>Set up your own custom domain for your Onlook apps.</span>
            </div>
        </div>
    );
};

export default DomainTab;
