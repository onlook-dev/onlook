import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

const ModeToggle = ({
    currentTab,
    setCurrentTab,
}: {
    currentTab: 'projects' | 'settings';
    setCurrentTab: (tab: 'projects' | 'settings') => void;
}) => {
    return (
        <ToggleGroup
            type="single"
            value={currentTab}
            onValueChange={(value) => {
                if (value) {
                    setCurrentTab(value as 'projects' | 'settings');
                }
            }}
            className="mb-3 h-12"
        >
            <ToggleGroupItem
                value="projects"
                aria-label="Toggle Projects"
                variant={'overline'}
                className="flex items-end"
            >
                Projects
            </ToggleGroupItem>
            <ToggleGroupItem
                value="settings"
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
