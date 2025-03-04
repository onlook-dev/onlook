import { useProjectsManager } from '@/components/Context';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Separator } from '@onlook/ui/separator';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { NoVersions } from './NoVersions';
import { SavedVersions } from './SavedVersions';
import { Versions } from './Versions';

export const VersionsTab = observer(() => {
    const projectsManager = useProjectsManager();
    const commits = projectsManager.versions?.commits;
    const savedCommits = projectsManager.versions?.savedCommits;

    useEffect(() => {
        projectsManager.versions?.listCommits();
    }, []);

    if (!commits) {
        return <NoVersions />;
    }

    return (
        <div className="flex flex-col h-full space-y-6 relative">
            <Button
                variant="outline"
                className="ml-auto w-fit bg-background-secondary absolute top-0 right-0"
                size="sm"
                onClick={() => projectsManager.versions?.saveCommit()}
            >
                <Icons.Plus className="h-4 w-4 mr-2" />
                New backup
            </Button>
            {savedCommits && savedCommits.length > 0 && (
                <>
                    <SavedVersions />
                    <Separator />
                </>
            )}
            <Versions />
        </div>
    );
});
