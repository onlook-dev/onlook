import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

const ModeToggle = observer(() => {
    const [mode, setMode] = useState<'projects' | 'settings'>('projects');

    return (
        <ToggleGroup
            type="single"
            value={mode}
            onValueChange={(value) => {
                if (value) {
                    setMode(value as 'projects' | 'settings');
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
});

export default ModeToggle;
