import { useProjectsManager } from '@/components/Context';
import { observer } from 'mobx-react-lite';
import NoProjectsScreen from './NoProjectsScreen';
import SelectProject from './Select';

const ProjectsTab = observer(() => {
    const projectsManager = useProjectsManager();

    if (projectsManager.projects.length === 0) {
        return <NoProjectsScreen />;
    }
    return <SelectProject />;
});

export default ProjectsTab;
