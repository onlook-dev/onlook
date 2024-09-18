import { useState } from 'react';
import { ProjectsTab } from './ProjectsTab';
import { SettingsTab } from './SettingsTab';
import TopBar from './TopBar';

export enum ProjectsPageTab {
    PROJECTS = 'projects',
    SETTINGS = 'settings',
}

export default function Projects() {
    const [currentTab, setCurrentTab] = useState<ProjectsPageTab>(ProjectsPageTab.PROJECTS);

    return (
        <div className="w-full">
            <TopBar currentTab={currentTab} setCurrentTab={setCurrentTab} />
            {currentTab === ProjectsPageTab.PROJECTS && <ProjectsTab />}
            {currentTab === ProjectsPageTab.SETTINGS && <SettingsTab />}
        </div>
    );
}
