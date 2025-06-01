import { useEditorEngine } from '@/components/store/editor';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Separator } from '@onlook/ui/separator';
import { observer } from 'mobx-react-lite';
import { useTranslations } from 'next-intl';
import { DeviceSettings } from './device-settings';
import { FrameDimensions } from './frame-dimensions';

export const WindowsTab = observer(() => {
    const editorEngine = useEditorEngine();
    const t = useTranslations();
    const WIDTH = 'w-[275px]';
    const selected = editorEngine.frames.selected;

    const emptyState = (
        <p
            className={`${WIDTH} h-full flex items-center justify-center p-2 text-center text-sm text-foreground-secondary`}
        >
            {t('editor.panels.layers.tabs.windows.emptyState')}
        </p>
    );

    const frameData = selected[0];

    if (selected.length === 0 || !frameData) {
        return emptyState;
    }

    return (
        <div className={`${WIDTH} flex flex-col gap-3 p-4`}>
            <div className="flex flex-row gap-1">
                <Button
                    variant={'outline'}
                    className="flex-1 h-fit py-1.5 px-2.5 text-foreground-tertiary items-center"
                    onClick={() => editorEngine.frames.duplicate(frameData?.frame.id)}
                >
                    <Icons.Copy className="mr-2" />
                    <span className="text-xs">Duplicate</span>
                </Button>
                <Button
                    variant={'outline'}
                    className="flex-1 h-fit py-1.5 px-2.5 text-foreground-tertiary items-center"
                    disabled={!editorEngine.frames.canDelete()}
                    onClick={() => editorEngine.frames.delete(frameData?.frame.id)}
                >
                    <Icons.Trash className="mr-2" />
                    <span className="text-xs">Delete</span>
                </Button>
            </div>

            <FrameDimensions frameId={frameData.frame.id} />
            <Separator />
            <DeviceSettings frameId={frameData.frame.id} />
        </div>
    );
});
