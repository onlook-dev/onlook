import { useProjectsManager } from '@/components/Context';
import { Separator } from '@onlook/ui/separator';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { NoVersions } from './NoVersions';
import { SavedVersions } from './SavedVersions';
import { Versions } from './Versions';

export const VersionsTab = observer(() => {
    const projectsManager = useProjectsManager();
    const commits = projectsManager.versions?.commits;

    useEffect(() => {
        projectsManager.versions?.listCommits();
    }, []);

    if (!commits) {
        return <NoVersions />;
    }

    return (
        <div className="flex flex-col h-full relative text-sm">
            <SavedVersions />
            <Separator />
            <Versions />
        </div>
    );
});
