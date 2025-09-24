import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';

import { SystemTheme } from '@onlook/models/assets';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { toast } from '@onlook/ui/sonner';

import { useEditorEngine } from '@/components/store/editor';

export const DeviceSettings = observer(({ frameId }: { frameId: string }) => {
    const editorEngine = useEditorEngine();
    const frameData = editorEngine.frames.get(frameId);
    const [theme, setTheme] = useState<SystemTheme>(SystemTheme.SYSTEM);

    useEffect(() => {
        if (!frameData?.view) {
            console.error('No frame view found');
            return;
        }
        frameData.view.getTheme().then((theme) => setTheme(theme));
    }, [frameData]);

    if (!frameData) {
        return <p className="text-foreground-primary text-sm">Frame not found</p>;
    }

    async function changeTheme(newTheme: SystemTheme) {
        const previousTheme = theme;
        setTheme(newTheme);

        if (!frameData?.view) {
            console.error('No frame view found');
            return;
        }

        const success = await frameData?.view.setTheme(newTheme);
        if (!success) {
            toast.error('Failed to change theme');
            setTheme(previousTheme);
        }
    }

    return (
        <div className="flex flex-col gap-2">
            <p className="text-foreground-primary text-sm">Device Settings</p>
            <div className="flex flex-row items-center justify-between">
                <span className="text-foreground-secondary text-xs">Theme</span>
                <div className="bg-background-secondary flex w-3/5 flex-row rounded p-0.5">
                    <Button
                        size={'icon'}
                        className={`bg-background-secondary h-full flex-1 rounded-sm px-0.5 py-1.5 ${
                            theme === SystemTheme.SYSTEM
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
                        className={`bg-background-secondary h-full flex-1 rounded-sm px-0.5 py-1.5 ${
                            theme === SystemTheme.DARK
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
                        className={`bg-background-secondary h-full flex-1 rounded-sm px-0.5 py-1.5 ${
                            theme === SystemTheme.LIGHT
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
});
