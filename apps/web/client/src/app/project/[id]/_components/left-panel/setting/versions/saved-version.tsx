import { useProjectManager } from '@/components/store/project';
import { Separator } from '@onlook/ui/separator';
import { observer } from 'mobx-react-lite';
import { VersionRow, VersionRowType } from './version-row';
import { NoSavedVersions } from './empty-state/saved';

export const SavedVersions = observer(() => {
    const projectManager = useProjectManager();
    const commits = projectManager.versions?.savedCommits;

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