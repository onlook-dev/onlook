import { useProjectsManager } from '@/components/Context';
import type { CreateMethod } from '@/routes/projects/helpers';
import { observer } from 'mobx-react-lite';
import { ChooseMethod } from './Create/ChooseMethod';

const ProjectsTab = observer(
    ({ setCreateMethod }: { setCreateMethod: (method: CreateMethod | null) => void }) => {
        const projectsManager = useProjectsManager();
        return (
            <ChooseMethod setCreateMethod={setCreateMethod} />
            // <>
            //     {projectsManager.projects.length === 0 && (
            //         <ChooseMethod setCreateMethod={setCreateMethod} />
            //     )}
            //     {projectsManager.projects.length > 0 && <SelectProject />}
            // </>
        );
    },
);

export default ProjectsTab;
