import { useEditorEngine } from '@/components/Context';
import type { FrameSettings } from '@onlook/models/projects';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Separator } from '@onlook/ui/separator';
import DeviceSettings from '../../EditPanel/WindowSettings/DeviceSettings';
import FrameDimensions from '../../EditPanel/WindowSettings/FrameDimensions';
import React from 'react';

const WindowsTab = () => {
    const editorEngine = useEditorEngine();
    const settings = editorEngine.isWindowSelected
        ? editorEngine.canvas.getFrame(editorEngine.webviews.selected[0].id)
        : null;

    if (!settings) {
        return (
            <div className="w-full h-full flex items-center justify-center">
                <p className="text-sm text-foreground-secondary">
                    Select a window to edit its settings
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col">
            <div className="flex flex-col gap-3 px-3 py-2">
                <div className="flex flex-row gap-1">
                    <Button
                        variant={'outline'}
                        className="h-fit py-1.5 px-2.5 text-foreground-tertiary w-full items-center"
                        onClick={() => editorEngine.duplicateWindow(settings.id)}
                    >
                        <Icons.Copy className="mr-2" />
                        <span className="text-xs">Duplicate</span>
                    </Button>
                    <Button
                        variant={'outline'}
                        className="h-fit py-1.5 px-2.5 text-foreground-tertiary w-full items-center"
                        disabled={!editorEngine.canDeleteWindow()}
                        onClick={() => editorEngine.deleteWindow(settings.id)}
                    >
                        <Icons.Trash className="mr-2" />
                        <span className="text-xs">Delete</span>
                    </Button>
                </div>

                <FrameDimensions settings={settings} />
                <Separator />
                <DeviceSettings settings={settings} />
            </div>
        </div>
    );
};

export default WindowsTab;
