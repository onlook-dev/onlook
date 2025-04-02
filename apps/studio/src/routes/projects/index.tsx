import { useProjectsManager } from '@/components/Context';
import { ProjectTabs } from '@/lib/projects';
import { observer } from 'mobx-react-lite';
import ProjectsTab from './ProjectsTab';
import CreateProject from './ProjectsTab/Create';
import PromptCreation from './PromptCreation';
import { TopBar } from './TopBar';
import { CreateMethod } from './helpers';

export const Projects = observer(() => {
    const projectsManager = useProjectsManager();
    const renderTab = () => {
        switch (projectsManager.projectsTab) {
            case ProjectTabs.PROJECTS:
                return <ProjectsTab />;
            case ProjectTabs.PROMPT_CREATE:
                return <PromptCreation />;
            case ProjectTabs.IMPORT_PROJECT:
                return (
                    <CreateProject
                        createMethod={CreateMethod.LOAD}
                        setCreateMethod={() => {
                            projectsManager.projectsTab = ProjectTabs.PROJECTS;
                        }}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <div className="w-full h-[calc(100vh-2.5rem)]">
            <TopBar />
            <div className="flex h-[calc(100vh-5.5rem)] justify-center overflow-hidden w-full">
                {renderTab()}
            </div>
        </div>
    );
});
