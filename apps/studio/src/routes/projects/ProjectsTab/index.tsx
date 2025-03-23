import { useProjectsManager } from '@/components/Context';
import { observer } from 'mobx-react-lite';
import { PromptCreation } from '../PromptCreation';
import SelectProject from './Select';

const ProjectsTab = observer(() => {
    const projectsManager = useProjectsManager();

    if (projectsManager.projects.length === 0) {
        return <PromptCreation initialScreen={true} />;
    }
    return <SelectProject />;
});

export default ProjectsTab;
