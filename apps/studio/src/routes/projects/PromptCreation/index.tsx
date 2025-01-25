import backgroundImageDark from '@/assets/dunes-create-dark.png';
import backgroundImageLight from '@/assets/dunes-create-light.png';
import { useProjectsManager } from '@/components/Context';
import { useTheme } from '@/components/ThemeProvider';
import { ProjectTabs } from '@/lib/projects';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { useEffect, useState } from 'react';
import { PromptingCard } from './PromptingCard';

export const PromptCreation = () => {
    const projectsManager = useProjectsManager();
    const { theme } = useTheme();
    const [backgroundImage, setBackgroundImage] = useState(backgroundImageLight);

    useEffect(() => {
        const handleEscapeKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                returnToProjects();
            }
        };

        window.addEventListener('keydown', handleEscapeKey);
        return () => window.removeEventListener('keydown', handleEscapeKey);
    }, []);

    const returnToProjects = () => {
        projectsManager.projectsTab = ProjectTabs.PROJECTS;
    };

    useEffect(() => {
        const determineBackgroundImage = () => {
            if (theme === 'dark') {
                return backgroundImageDark;
            } else if (theme === 'light') {
                return backgroundImageLight;
            } else if (theme === 'system') {
                return window.matchMedia('(prefers-color-scheme: dark)').matches
                    ? backgroundImageDark
                    : backgroundImageLight;
            }
            return backgroundImageLight;
        };

        setBackgroundImage(determineBackgroundImage());
    }, [theme]);

    return (
        <div className="fixed inset-0">
            <div
                className="relative w-full h-full flex items-center justify-center"
                style={{
                    backgroundImage: `url(${backgroundImage})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
            >
                <div className="absolute inset-0 bg-background/50" />
                <div className="relative z-10">
                    <div className="h-fit w-fit flex group fixed top-10 right-10">
                        <Button
                            variant="secondary"
                            className="w-fit h-fit flex flex-col gap-1 text-foreground-secondary hover:text-foreground-active backdrop-blur-md bg-background/30"
                            onClick={returnToProjects}
                        >
                            <Icons.CrossL className="w-4 h-4 cursor-pointer" />
                            <p className="text-microPlus">Close</p>
                        </Button>
                    </div>
                    <div className="flex items-center justify-center p-4">
                        <PromptingCard />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PromptCreation;
