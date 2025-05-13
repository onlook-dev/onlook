import { useEditorEngine } from '@/components/store/editor';
import type { FrameImpl } from '@/components/store/editor/canvas/frame';
import type { Theme } from '@onlook/constants';
import { SystemTheme } from '@onlook/models/assets';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons/index';
import { useEffect, useState } from 'react';

export const DeviceSettings = ({ frame }: { frame: FrameImpl }) => {
    const editorEngine = useEditorEngine();
    const [deviceTheme, setDeviceTheme] = useState(frame.theme);

    useEffect(() => {
        setDeviceTheme(frame.theme);
    }, [frame.id]);

    // useEffect(() => {
    //     const observer = (newSettings: Frame) => {
    //         if (newSettings.theme !== deviceTheme) {
    //             setDeviceTheme(newSettings.theme);
    //         }
    //     };

    //     editorEngine.canvas.observeSettings(settings.id, observer);

    //     return editorEngine.canvas.unobserveSettings(settings.id, observer);
    // }, []);

    async function changeTheme(theme: SystemTheme) {
        const frameView = editorEngine.frames.get(frame.id)?.view;
        if (!frameView) {
            return;
        }

        frameView.setTheme(theme);
        setDeviceTheme(theme as Theme);

        // editorEngine.canvas.saveFrame(settings.id, {
        //     theme,
        // });
    }

    return (
        <div className="flex flex-col gap-2">
            <p className="text-sm text-foreground-primary">Device Settings</p>
            <div className="flex flex-row justify-between items-center">
                <span className="text-xs text-foreground-secondary">Theme</span>
                <div className="flex flex-row p-0.5 w-3/5 bg-background-secondary rounded">
                    <Button
                        size={'icon'}
                        className={`flex-1 h-full px-0.5 py-1.5 bg-background-secondary rounded-sm ${deviceTheme === SystemTheme.SYSTEM
                                ? 'bg-background-tertiary hover:bg-background-tertiary'
                                : 'hover:bg-background-tertiary/50 text-foreground-onlook'
                            }`}
                        variant={'ghost'}
                        onClick={() => changeTheme(SystemTheme.SYSTEM)}
                    >
                        <Icons.Laptop />
                    </Button>
                    <Button
                        size={'icon'}
                        className={`flex-1 h-full px-0.5 py-1.5 bg-background-secondary rounded-sm ${deviceTheme === SystemTheme.DARK
                                ? 'bg-background-tertiary hover:bg-background-tertiary'
                                : 'hover:bg-background-tertiary/50 text-foreground-onlook'
                            }`}
                        variant={'ghost'}
                        onClick={() => changeTheme(SystemTheme.DARK)}
                    >
                        <Icons.Moon />
                    </Button>
                    <Button
                        size={'icon'}
                        className={`flex-1 h-full px-0.5 py-1.5 bg-background-secondary rounded-sm ${deviceTheme === SystemTheme.LIGHT
                                ? 'bg-background-tertiary hover:bg-background-tertiary'
                                : 'hover:bg-background-tertiary/50 text-foreground-onlook'
                            }`}
                        variant={'ghost'}
                        onClick={() => changeTheme(SystemTheme.LIGHT)}
                    >
                        <Icons.Sun />
                    </Button>
                </div>
            </div>
        </div>
    );
};
