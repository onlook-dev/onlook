import { useProjectsManager } from '@/components/Context';
import { Separator } from '@onlook/ui/separator';
import { observer } from 'mobx-react-lite';
import { VersionRow, VersionRowType } from './VersionRow';

export const Versions = observer(() => {
    const projectsManager = useProjectsManager();
    const commits = projectsManager.versions?.commits;

    return (
        <div className="flex flex-col space-y-4 text-sm">
            <h2 className="">Versions</h2>
            <Separator />
            <div className="space-y-1">
                <div className="">Today</div>
                {commits?.map((commit) => (
                    <VersionRow key={commit.oid} commit={commit} type={VersionRowType.TODAY} />
                ))}
            </div>
        </div>
    );
});
