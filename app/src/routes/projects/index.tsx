import { useState } from 'react';
import { ProjectsTab } from './ProjectsTab';
import { SettingsTab } from './SettingsTab';
import TopBar from './TopBar';

export default function Projects() {
    const [currentTab, setCurrentTab] = useState<'projects' | 'settings'>('projects');

    return (
        <div className="h-12 w-full">
            <TopBar currentTab={currentTab} setCurrentTab={setCurrentTab} />
            {currentTab === 'projects' && <ProjectsTab />}
            {currentTab === 'settings' && <SettingsTab />}
        </div>
    );
}
