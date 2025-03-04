import { useProjectsManager } from '@/components/Context';
import { observer } from 'mobx-react-lite';
import { VersionRow } from './VersionRow';

export const SavedVersions = observer(() => {
    const projectsManager = useProjectsManager();
    const commits = projectsManager.versions?.commits;

    return (
        <div className="space-y-4">
            <h2 className="">Saved Versions</h2>
            <div className="space-y-2">
                {commits?.map((commit) => <VersionRow key={commit.oid} commit={commit} />)}
            </div>
        </div>
    );
});
