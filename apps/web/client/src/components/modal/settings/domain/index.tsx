import { useEditorEngine, useUserManager } from '@/components/store';
import { Separator } from '@onlook/ui/separator';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { BaseDomain } from './base';
import { CustomDomain } from './custom';
import { DangerZone } from './danger-zone';
import { EnvVars } from './env-vars';

export const DomainTab = observer(() => {
    const userManager = useUserManager();
    const editorEngine = useEditorEngine();

    // useEffect(() => {
    //     userManager.subscription.getPlanFromServer();
    // }, [editorEngine.state.settingsOpen]);

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
            <div className="flex flex-col gap-4 p-6">
                <EnvVars />
            </div>
            <Separator />
            <div className="p-6">
                <DangerZone />
            </div>
        </div>
    );
});
