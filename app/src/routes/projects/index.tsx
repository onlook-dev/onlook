import { sendAnalytics } from '@/lib/utils';
import { CreateMethod } from '@/routes/projects/helpers';
import { useState } from 'react';
import ProjectsTab from './ProjectsTab';
import CreateProject from './ProjectsTab/Create';
import SettingsTab from './SettingsTab';
import TopBar from './TopBar';

export enum ProjectTabs {
    PROJECTS = 'projects',
    SETTINGS = 'settings',
}

export default function Projects() {
    const [currentTab, setCurrentTab] = useState<ProjectTabs>(ProjectTabs.PROJECTS);
    const [createMethod, setCreateMethod] = useState<CreateMethod | null>(null);

    const setCurrentTabTracked = (tab: ProjectTabs) => {
        setCurrentTab(tab);
        if (tab !== currentTab) {
            sendAnalytics('navigate', { tab });
        }
    };

    return (
        <div className="w-full h-[calc(100vh-2.5rem)]">
            <TopBar
                createMethod={createMethod}
                setCreateMethod={setCreateMethod}
                currentTab={currentTab}
                setCurrentTab={setCurrentTabTracked}
            />
            <div className="flex  h-[calc(100vh-5.5rem)] justify-center">
                {createMethod ? (
                    <CreateProject createMethod={createMethod} setCreateMethod={setCreateMethod} />
                ) : (
                    <>
                        {currentTab === ProjectTabs.PROJECTS && (
                            <ProjectsTab setCreateMethod={setCreateMethod} />
                        )}
                        {currentTab === ProjectTabs.SETTINGS && <SettingsTab />}
                    </>
                )}
            </div>
        </div>
    );
}
