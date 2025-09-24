import { observer } from 'mobx-react-lite';

import { Separator } from '@onlook/ui/separator';

import { useEditorEngine } from '@/components/store/editor';
import { NoSavedVersions } from './empty-state/saved';
import { VersionRow, VersionRowType } from './version-row';

export const SavedVersions = observer(() => {
    const editorEngine = useEditorEngine();
    const commits = editorEngine.versions.savedCommits;

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
