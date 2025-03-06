import { useProjectsManager } from '@/components/Context';
import { Separator } from '@onlook/ui/separator';
import { observer } from 'mobx-react-lite';
import { NoSavedVersions } from './EmptyState/Saved';
import { VersionRow, VersionRowType } from './VersionRow';

export const SavedVersions = observer(() => {
    const projectsManager = useProjectsManager();
    const commits = projectsManager.versions?.savedCommits;

    return (
        <div className="flex flex-col gap-4 p-4">
            <h2 className="pl-2">Saved Versions</h2>
            <Separator />
            {commits && commits.length > 0 ? (
                <div className="flex flex-col gap-2">
                    {commits?.map((commit) => (
                        <VersionRow key={commit.oid} commit={commit} type={VersionRowType.SAVED} />
                    ))}
                </div>
            ) : (
                <NoSavedVersions />
            )}
        </div>
    );
});
