import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { motion } from 'framer-motion';
import { ProjectsPageTab } from '../..';
import { capitalizeFirstLetter } from '/common/helpers';

const MODE_TOGGLE_ITEMS: {
    tab: ProjectsPageTab;
}[] = [
    {
        tab: ProjectsPageTab.PROJECTS,
    },
    {
        tab: ProjectsPageTab.SETTINGS,
    },
];

const ModeToggle = ({
    currentTab,
    setCurrentTab,
}: {
    currentTab: ProjectsPageTab;
    setCurrentTab: (tab: ProjectsPageTab) => void;
}) => {
    return (
        <div className="relative">
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
                {MODE_TOGGLE_ITEMS.map((item) => (
                    <ToggleGroupItem
                        key={item.tab}
                        variant={'custom-overline'}
                        value={item.tab}
                        aria-label={item.tab}
                        className={`border-none transition-all duration-150 ease-in-out px-4 py-2 ${
                            currentTab === item.tab
                                ? 'text-active font-medium hover:text-active'
                                : 'font-normal hover:text-text-hover'
                        }`}
                    >
                        {capitalizeFirstLetter(item.tab)}
                    </ToggleGroupItem>
                ))}
            </ToggleGroup>
            <motion.div
                className="absolute top-1 h-0.5 bg-white"
                initial={false}
                animate={{
                    width: '50%',
                    x: currentTab === ProjectsPageTab.PROJECTS ? '0%' : '100%',
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
