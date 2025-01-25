import backgroundImageDark from '@/assets/dunes-create-dark.png';
import backgroundImageLight from '@/assets/dunes-create-light.png';
import { useTheme } from '@/components/ThemeProvider';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';
import { useEffect, useState } from 'react';
import { CreatingCard } from './CreatingCard';
import { PromptingCard } from './PromptingCard';

export enum PromptCreationState {
    PROMPTING = 'prompting',
    CREATING = 'creating',
}

export const PromptCreation = () => {
    const { theme } = useTheme();
    const [backgroundImage, setBackgroundImage] = useState(backgroundImageLight);
    const [promptCreationState, setPromptCreationState] = useState(PromptCreationState.CREATING);

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
        if (promptCreationState === PromptCreationState.CREATING) {
            console.warn('Cannot return to projects while creating');
            return;
        }
        setPromptCreationState(PromptCreationState.PROMPTING);
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

    const renderCard = () => {
        switch (promptCreationState) {
            case PromptCreationState.PROMPTING:
                return <PromptingCard setPromptCreationState={setPromptCreationState} />;
            case PromptCreationState.CREATING:
                return <CreatingCard setPromptCreationState={setPromptCreationState} />;
        }
    };

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
                            className={cn(
                                'w-fit h-fit flex flex-col gap-1 text-foreground-secondary hover:text-foreground-active backdrop-blur-md bg-background/30',
                                promptCreationState !== PromptCreationState.PROMPTING && 'hidden',
                            )}
                            onClick={returnToProjects}
                        >
                            <Icons.CrossL className="w-4 h-4 cursor-pointer" />
                            <p className="text-microPlus">Close</p>
                        </Button>
                    </div>
                    <div className="flex items-center justify-center p-4">{renderCard()}</div>
                </div>
            </div>
        </div>
    );
};

export default PromptCreation;
