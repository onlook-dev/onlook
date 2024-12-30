import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons/index';
import { Separator } from '@onlook/ui/separator';
import FrameDimensions from './FrameDimensions';
import DeviceSettings from './DeviceSettings';
import type { FrameSettings } from '@onlook/models/projects';
import { nanoid } from 'nanoid/non-secure';
import { useEditorEngine } from '@/components/Context';

const WindowSettings = ({
    setIsOpen,
    settings,
}: {
    setIsOpen: (isOpen: boolean) => void;
    settings: FrameSettings;
}) => {
    const editorEngine = useEditorEngine();

    function duplicateWindow(linked: boolean = false) {
        const currentFrame = settings;
        const newFrame: FrameSettings = {
            id: nanoid(),
            url: currentFrame.url,
            dimension: {
                width: currentFrame.dimension.width,
                height: currentFrame.dimension.height,
            },
            position: currentFrame.position,
            duplicate: true,
            linkedIds: linked ? [currentFrame.id] : [],
            aspectRatioLocked: currentFrame.aspectRatioLocked,
            orientation: currentFrame.orientation,
            device: currentFrame.device,
            theme: currentFrame.theme,
        };

        if (linked) {
            currentFrame.linkedIds = [...(currentFrame.linkedIds || []), newFrame.id];
            editorEngine.canvas.saveFrame(currentFrame.id, {
                linkedIds: currentFrame.linkedIds,
            });
        }

        editorEngine.canvas.frames = [...editorEngine.canvas.frames, newFrame];
    }

    function deleteDuplicateWindow() {
        editorEngine.canvas.frames = editorEngine.canvas.frames.filter(
            (frame) => frame.id !== settings.id,
        );

        editorEngine.canvas.frames.forEach((frame) => {
            frame.linkedIds = frame.linkedIds?.filter((id) => id !== settings.id) || null;
        });

        const webview = editorEngine.webviews.getWebview(settings.id);
        if (webview) {
            editorEngine.webviews.deregister(webview);
        }
    }

    return (
        <div className="flex flex-col">
            <div className="rounded-lg p-1 text-muted-foreground bg-transparent w-full gap-2 select-none justify-between items-center h-full px-2">
                <div className="flex flex-row items-center gap-2">
                    <button
                        className="text-default rounded-lg p-2 bg-transparent hover:text-foreground-hover"
                        onClick={() => setIsOpen(false)}
                    >
                        <Icons.PinRight />
                    </button>
                    <div className="bg-transparent py-2 px-1 text-xs text-foreground-primary">
                        Window
                    </div>
                </div>
            </div>
            <Separator />
            <div className="flex flex-col gap-3 px-3 py-2">
                <div className="flex flex-row gap-1">
                    <Button
                        variant={'outline'}
                        className="h-fit py-1.5 px-2.5 text-foreground-tertiary w-full items-center"
                        onClick={() => duplicateWindow(false)}
                    >
                        <Icons.Copy className="mr-2" />
                        <span className="text-xs">Duplicate</span>
                    </Button>
                    <Button
                        variant={'outline'}
                        className="h-fit py-1.5 px-2.5 text-foreground-tertiary w-full items-center"
                        disabled={!settings.duplicate}
                        onClick={deleteDuplicateWindow}
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

export default WindowSettings;
