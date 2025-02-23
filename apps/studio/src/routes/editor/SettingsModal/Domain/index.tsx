import { useEditorEngine, useUserManager } from '@/components/Context';
import { Separator } from '@onlook/ui/separator';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import BaseDomain from './Base';
import { CustomDomain } from './Custom';

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
        </div>
    );
});

export default DomainTab;
