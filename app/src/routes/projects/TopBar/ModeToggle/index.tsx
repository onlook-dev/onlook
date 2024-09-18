import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ProjectsPageTab } from '../..';

const ModeToggle = ({
    currentTab,
    setCurrentTab,
}: {
    currentTab: ProjectsPageTab;
    setCurrentTab: (tab: ProjectsPageTab) => void;
}) => {
    return (
        <ToggleGroup
            type="single"
            value={currentTab}
            onValueChange={(value) => {
                if (value) {
                    setCurrentTab(value as ProjectsPageTab);
                }
            }}
            className="mb-3 h-12"
        >
            <ToggleGroupItem
                value={ProjectsPageTab.PROJECTS}
                aria-label="Toggle Projects"
                variant={'overline'}
                className="flex items-end"
            >
                Projects
            </ToggleGroupItem>
            <ToggleGroupItem
                value={ProjectsPageTab.SETTINGS}
                aria-label="Toggle Settings"
                variant={'overline'}
                className="flex items-end"
            >
                Settings
            </ToggleGroupItem>
        </ToggleGroup>
    );
};

export default ModeToggle;
