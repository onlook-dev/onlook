import { useProjectsManager } from '@/components/Context';
import { Button } from '@onlook/ui/button';
import { observer } from 'mobx-react-lite';

export const NoVersions = observer(() => {
    const projectsManager = useProjectsManager();
    return (
        <div className="flex flex-col items-center h-full gap-4">
            <div className="mt-40 text-lg ">No saves found</div>
            <Button onClick={() => projectsManager.versions?.initializeRepo()}>
                Create a new save
            </Button>
        </div>
    );
});
