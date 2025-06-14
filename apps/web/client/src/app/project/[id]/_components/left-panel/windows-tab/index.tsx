import { useEditorEngine } from '@/components/store/editor';
import { transKeys } from '@/i18n/keys';
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
            {t(transKeys.editor.panels.layers.tabs.windows.emptyState)}
        </p>
    );

    const frameData = selected[0];

    if (selected.length === 0 || !frameData) {
        return emptyState;
    }

    return (
        <div className={`${WIDTH} flex flex-col gap-3 p-4`}>
            <FrameDimensions frameId={frameData.frame.id} />
            <Separator />
            <DeviceSettings frameId={frameData.frame.id} />
        </div>
    );
});
