import { SelectProject } from './_components/select';
import { TopBar } from './_components/top-bar';

// import { useProjectsManager } from '@/components/Context';
// import { ProjectTabs } from '@/lib/projects';
// import ProjectsTab from './ProjectsTab';
// import CreateProject from './ProjectsTab/Create';
// import PromptCreation from './PromptCreation';
// import { CreateMethod } from './helpers';

const Projects = () => {
    // const projectsManager = useProjectsManager();
    const renderTab = () => {
        //     switch (projectsManager.projectsTab) {
        //         case ProjectTabs.PROJECTS:
        //             return <ProjectsTab />;
        //         case ProjectTabs.PROMPT_CREATE:
        //             return <PromptCreation />;
        //         case ProjectTabs.IMPORT_PROJECT:
        //             return (
        //                 <CreateProject
        //                     createMethod={CreateMethod.LOAD}
        //                     setCreateMethod={() => {
        //                         projectsManager.projectsTab = ProjectTabs.PROJECTS;
        //                     }}
        //                 />
        //             );
        //         default:
        //             return null;
        //     }

        return null;
    };

    return (
        <div className="w-full h-full">
            <TopBar />
            <div className="flex justify-center overflow-hidden w-full">
                <SelectProject />
            </div>
        </div>
    );
};

export default Projects;