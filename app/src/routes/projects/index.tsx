import { useState } from 'react';
import ProjectsTab from './ProjectsTab';
import CreateProject from './ProjectsTab/Create';
import SettingsTab from './SettingsTab';
import TopBar from './TopBar';

export enum ProjectTab {
    PROJECTS = 'projects',
    SETTINGS = 'settings',
}

export enum CreateMethod {
    LOAD = 'load',
    NEW = 'new',
}

export default function Projects() {
    const [currentTab, setCurrentTab] = useState<ProjectTab>(ProjectTab.PROJECTS);
    const [createMethod, setCreateMethod] = useState<CreateMethod | null>(null);

    return (
        <div className="w-full h-[calc(100vh-2.5rem)]">
            <TopBar
                createMethod={createMethod}
                setCreateMethod={setCreateMethod}
                currentTab={currentTab}
                setCurrentTab={setCurrentTab}
            />
            <div className="flex  h-[calc(100vh-5.5rem)] justify-center">
                {createMethod ? (
                    <CreateProject createMethod={createMethod} setCreateMethod={setCreateMethod} />
                ) : (
                    <>
                        {currentTab === ProjectTab.PROJECTS && (
                            <ProjectsTab setCreateMethod={setCreateMethod} />
                        )}
                        {currentTab === ProjectTab.SETTINGS && <SettingsTab />}
                    </>
                )}
            </div>
        </div>
    );
}
