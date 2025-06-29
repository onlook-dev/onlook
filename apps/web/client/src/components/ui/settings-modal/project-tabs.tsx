import { useStateManager } from '@/components/store/state';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';
import { capitalizeFirstLetter } from '@onlook/utility';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import DomainTab from './domain';
import { SettingsTabValue, type SettingTab } from './helpers';
import { ProjectTab } from './project';
import { SiteTab } from './site';
import { VersionsTab } from './versions';

export const ProjectTabs = observer(({ appendTabs }: { appendTabs: (tabs: SettingTab[]) => void }) => {
    const stateManager = useStateManager();


    useEffect(() => {
        appendTabs(tabs);
    }, []);

    return (
        <>

        </>
    )
});
