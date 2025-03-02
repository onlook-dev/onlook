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
        <div className="space-y-8">
            <BaseDomain />
            <Separator />
            <CustomDomain />
            <Separator />
            <DangerZone />
        </div>
    );
});

export default DomainTab;
