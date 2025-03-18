import { useEditorEngine, useUserManager } from '@/components/Context';
import { Separator } from '@onlook/ui/separator';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import BaseDomain from './Base';
import { CustomDomain } from './Custom';
import DangerZone from './DangerZone';

export const DomainTab = observer(() => {
    const userManager = useUserManager();
    const editorEngine = useEditorEngine();

    useEffect(() => {
        userManager.subscription.getPlanFromServer();
    }, [editorEngine.isSettingsOpen]);

    return (
        <div className="flex flex-col gap-2">
            <div className="p-6">
                <BaseDomain />
            </div>
            <Separator />
            <div className="p-6">
                <CustomDomain />
            </div>
            <Separator />
            <div className="p-6">
                <DangerZone />
            </div>
        </div>
    );
});

export default DomainTab;
