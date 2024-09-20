import { useProjectManager } from '@/components/Context/Projects';
import { observer } from 'mobx-react-lite';
import { CreateMethod } from '..';
import { ChooseMethod } from './Create/ChooseMethod';
import SelectProject from './Select';

const ProjectsTab = observer(
    ({ setCreateMethod }: { setCreateMethod: (method: CreateMethod | null) => void }) => {
        const projectManager = useProjectManager();
        return (
            <>
                {projectManager.projects.length === 0 && (
                    <ChooseMethod setCreateMethod={setCreateMethod} />
                )}
                {projectManager.projects.length > 0 && <SelectProject />}
            </>
        );
    },
);

export default ProjectsTab;
