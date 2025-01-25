import { useProjectsManager } from '@/components/Context';
import { observer } from 'mobx-react-lite';
import { ChooseMethod } from './Create/ChooseMethod';
import SelectProject from './Select';

const ProjectsTab = observer(() => {
    const projectsManager = useProjectsManager();
    return (
        <>
            {projectsManager.projects.length === 0 && <ChooseMethod />}
            {projectsManager.projects.length > 0 && <SelectProject />}
        </>
    );
});

export default ProjectsTab;
