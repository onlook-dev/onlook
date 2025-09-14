import { SystemTheme } from '@onlook/models/assets';
import { Icons } from '@onlook/ui/icons';
import { toast } from '@onlook/ui/sonner';
import { useEffect, useState } from 'react';
import { HoverOnlyTooltip } from '../hover-tooltip';
import { ToolbarButton } from '../toolbar-button';
import { type FrameData } from '@/components/store/editor/frames';

export function ThemeGroup({ frameData }: { frameData: FrameData }) {
    const [theme, setTheme] = useState<SystemTheme>(SystemTheme.SYSTEM);
    useEffect(() => {
        const getTheme = async () => {
            if (!frameData?.view) {
                console.error('No frame view found');
                return;
            }

            const theme = await frameData.view.getTheme();
            setTheme(theme);
        }
        void getTheme();
    }, [frameData]);

    async function changeTheme(newTheme: SystemTheme) {
        const previousTheme = theme;
        setTheme(newTheme);
        const success = await frameData.view?.setTheme(newTheme);
        if (!success) {
            toast.error('Failed to change theme');
            setTheme(previousTheme);
        }
    }

    return (
        <>
            <HoverOnlyTooltip content="System Theme" side="bottom" sideOffset={10}>
                    <ToolbarButton
                        className={`w-9 ${theme === SystemTheme.SYSTEM ? 'bg-background-tertiary/50 hover:bg-background-tertiary/50 text-foreground-primary' : 'hover:bg-background-tertiary/50 text-foreground-onlook'}`}
                        onClick={() => changeTheme(SystemTheme.SYSTEM)}
                    >
                        <Icons.Laptop className="h-4 w-4" />
                    </ToolbarButton>
            </HoverOnlyTooltip>
            <HoverOnlyTooltip content="Dark Theme" side="bottom" sideOffset={10}>
                    <ToolbarButton
                        className={`w-9 ${theme === SystemTheme.DARK ? 'bg-background-tertiary/50 hover:bg-background-tertiary/50 text-foreground-primary' : 'hover:bg-background-tertiary/50 text-foreground-onlook'}`}
                        onClick={() => changeTheme(SystemTheme.DARK)}
                    >
                        <Icons.Moon className="h-4 w-4" />
                    </ToolbarButton>
            </HoverOnlyTooltip>
            <HoverOnlyTooltip content="Light Theme" side="bottom" sideOffset={10}>
                    <ToolbarButton
                        className={`w-9 ${theme === SystemTheme.LIGHT ? 'bg-background-tertiary/50 hover:bg-background-tertiary/50 text-foreground-primary' : 'hover:bg-background-tertiary/50 text-foreground-onlook'}`}
                        onClick={() => changeTheme(SystemTheme.LIGHT)}
                    >
                        <Icons.Sun className="h-4 w-4" />
                    </ToolbarButton>
            </HoverOnlyTooltip>
        </>
    );
} 