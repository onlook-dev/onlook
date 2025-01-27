import { useProjectsManager } from '@/components/Context';
import { ProjectTabs } from '@/lib/projects';
import { ToggleGroup, ToggleGroupItem } from '@onlook/ui/toggle-group';
import { cn } from '@onlook/ui/utils';
import { motion } from 'motion/react';
import { capitalizeFirstLetter } from '/common/helpers';

const ModeToggle = () => {
    const projectsManager = useProjectsManager();
    const MODE_TOGGLE_ITEMS: ProjectTabs[] = [ProjectTabs.PROJECTS, ProjectTabs.SETTINGS];

    return (
        <div className="relative">
            <ToggleGroup
                type="single"
                value={projectsManager.projectsTab}
                onValueChange={(value) => {
                    if (value) {
                        projectsManager.projectsTab = value as ProjectTabs;
                    }
                }}
                className="pt-1 h-14"
            >
                {MODE_TOGGLE_ITEMS.map((tab) => (
                    <ToggleGroupItem
                        key={tab}
                        variant={'custom-overline'}
                        value={tab}
                        aria-label={tab}
                        className={cn(
                            'border-none transition-all duration-150 ease-in-out px-4 py-2',
                            projectsManager.projectsTab === tab
                                ? 'text-active font-medium hover:text-active'
                                : 'font-normal hover:text-foreground-hover',
                        )}
                    >
                        {capitalizeFirstLetter(tab)}
                    </ToggleGroupItem>
                ))}
            </ToggleGroup>
            <motion.div
                className="absolute top-1 h-0.5 bg-foreground"
                initial={false}
                animate={{
                    width: '50%',
                    x: projectsManager.projectsTab === ProjectTabs.PROJECTS ? '0%' : '100%',
                }}
                transition={{
                    type: 'tween',
                    ease: 'easeInOut',
                    duration: 0.2,
                }}
            />
        </div>
    );
};

export default ModeToggle;
