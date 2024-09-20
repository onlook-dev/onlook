import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { motion } from 'framer-motion';
import { ProjectTab } from '../..';
import { capitalizeFirstLetter } from '/common/helpers';

const ModeToggle = ({
    currentTab,
    setCurrentTab,
}: {
    currentTab: ProjectTab;
    setCurrentTab: (tab: ProjectTab) => void;
}) => {
    const MODE_TOGGLE_ITEMS: ProjectTab[] = [ProjectTab.PROJECTS, ProjectTab.SETTINGS];
    return (
        <div className="relative">
            <ToggleGroup
                type="single"
                value={currentTab}
                onValueChange={(value) => {
                    if (value) {
                        setCurrentTab(value as ProjectTab);
                    }
                }}
                className="mb-3 h-12"
            >
                {MODE_TOGGLE_ITEMS.map((tab) => (
                    <ToggleGroupItem
                        key={tab}
                        variant={'custom-overline'}
                        value={tab}
                        aria-label={tab}
                        className={`border-none transition-all duration-150 ease-in-out px-4 py-2 ${
                            currentTab === tab
                                ? 'text-active font-medium hover:text-active'
                                : 'font-normal hover:text-text-hover'
                        }`}
                    >
                        {capitalizeFirstLetter(tab)}
                    </ToggleGroupItem>
                ))}
            </ToggleGroup>
            <motion.div
                className="absolute top-1 h-0.5 bg-white"
                initial={false}
                animate={{
                    width: '50%',
                    x: currentTab === ProjectTab.PROJECTS ? '0%' : '100%',
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
