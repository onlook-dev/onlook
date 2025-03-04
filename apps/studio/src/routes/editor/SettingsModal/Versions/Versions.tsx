import { useProjectsManager } from '@/components/Context';
import { observer } from 'mobx-react-lite';
import { VersionRow } from './VersionRow';

export const Versions = observer(() => {
    const projectsManager = useProjectsManager();
    const commits = projectsManager.versions?.commits;

    return (
        <div className="flex-1 space-y-4">
            <h2 className="text-lg font-semibold">Versions</h2>
            <div className="space-y-1">
                <div className="font-medium">Today</div>
                {commits?.map((commit) => <VersionRow key={commit.oid} commit={commit} />)}
            </div>
        </div>
    );
});
