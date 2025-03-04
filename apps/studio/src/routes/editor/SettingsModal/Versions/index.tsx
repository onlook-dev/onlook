import { useProjectsManager } from '@/components/Context';
import { Separator } from '@onlook/ui/separator';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { SavedVersions } from './SavedVersions';
import { Versions } from './Versions';

export const VersionsTab = observer(() => {
    const projectsManager = useProjectsManager();
    const commits = projectsManager.versions?.commits;

    useEffect(() => {
        projectsManager.versions?.listCommits();
    }, []);

    return (
        <div className="flex flex-col h-full relative text-sm">
            {commits && commits.length > 0 ? (
                <>
                    <SavedVersions />
                    <Separator />
                </>
            ) : null}
            <Versions />
        </div>
    );
});
