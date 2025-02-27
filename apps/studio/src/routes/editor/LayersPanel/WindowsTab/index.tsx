import { useEditorEngine } from '@/components/Context';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Separator } from '@onlook/ui/separator';
import { observer } from 'mobx-react-lite';
import DeviceSettings from './DeviceSettings';
import FrameDimensions from './FrameDimensions';

const WindowsTab = observer(() => {
    const editorEngine = useEditorEngine();
    let settings = null;

    // Get settings from the selected element or webview
    if (editorEngine.elements.selected.length > 0) {
        settings = editorEngine.canvas.getFrame(editorEngine.elements.selected[0].webviewId);
    } else if (editorEngine.webviews.selected.length > 0) {
        settings = editorEngine.canvas.getFrame(editorEngine.webviews.selected[0].id);
    }

    if (!settings) {
        return (
            <div className="w-[245px] h-full flex items-center justify-center p-2 text-center">
                <p className="text-sm text-foreground-secondary">
                    Select a window to edit its settings
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3 p-4 w-[275px]">
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
    );
});

export default WindowsTab;
