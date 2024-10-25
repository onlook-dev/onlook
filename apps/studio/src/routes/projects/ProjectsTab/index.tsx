import { useProjectsManager } from '@/components/Context';
import { observer } from 'mobx-react-lite';
import { CreateMethod } from '@/routes/projects/helpers';
import { ChooseMethod } from './Create/ChooseMethod';
import SelectProject from './Select';

const ProjectsTab = observer(
    ({ setCreateMethod }: { setCreateMethod: (method: CreateMethod | null) => void }) => {
        const projectsManager = useProjectsManager();
        return (
            <>
                {projectsManager.projects.length === 0 && (
                    <ChooseMethod setCreateMethod={setCreateMethod} />
                )}
                {projectsManager.projects.length > 0 && <SelectProject />}
            </>
        );
    },
);

export default ProjectsTab;
