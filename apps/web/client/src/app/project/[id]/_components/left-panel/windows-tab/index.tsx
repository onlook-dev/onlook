import { useEditorEngine } from '@/components/store';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { observer } from 'mobx-react-lite';
import { useTranslations } from 'next-intl';

export const WindowsTab = observer(() => {
    const editorEngine = useEditorEngine();
    const t = useTranslations();
    const frameData = editorEngine.frames.get(editorEngine.elements.selected[0]?.frameId ?? '');
    const WIDTH = 'w-[275px]';

    if (!frameData) {
        return (
            <p
                className={`${WIDTH} h-full flex items-center justify-center p-2 text-center text-sm text-foreground-secondary`}
            >
                {t('editor.panels.layers.tabs.windows.emptyState')}
            </p>
        );
    }

    const { frame } = frameData;

    return (
        <div className={`${WIDTH} flex flex-col gap-3 p-4`}>
            <div className="flex flex-row gap-1">
                <Button
                    variant={'outline'}
                    className="h-fit py-1.5 px-2.5 text-foreground-tertiary w-full items-center"
                    onClick={() => editorEngine.window.duplicate(frame.id)}
                >
                    <Icons.Copy className="mr-2" />
                    <span className="text-xs">Duplicate</span>
                </Button>
                <Button
                    variant={'outline'}
                    className="h-fit py-1.5 px-2.5 text-foreground-tertiary w-full items-center"
                    disabled={!editorEngine.window.canDelete()}
                    onClick={() => editorEngine.window.delete(frame.id)}
                >
                    <Icons.Trash className="mr-2" />
                    <span className="text-xs">Delete</span>
                </Button>
            </div>

            {/* <FrameDimensions frame={frame} /> */}
            {/* <Separator /> */}
            {/* <DeviceSettings frame={frame} /> */}
        </div>
    );
});
