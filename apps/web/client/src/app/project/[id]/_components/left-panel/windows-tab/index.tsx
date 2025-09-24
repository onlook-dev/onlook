import { observer } from 'mobx-react-lite';
import { useTranslations } from 'next-intl';

import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Separator } from '@onlook/ui/separator';

import { useEditorEngine } from '@/components/store/editor';
import { transKeys } from '@/i18n/keys';
import { DeviceSettings } from './device-settings';
import { FrameDimensions } from './frame-dimensions';

export const WindowsTab = observer(() => {
    const editorEngine = useEditorEngine();
    const t = useTranslations();
    const WIDTH = 'w-[275px]';
    const selected = editorEngine.frames.selected;

    const emptyState = (
        <p
            className={`${WIDTH} text-foreground-secondary flex h-full items-center justify-center p-2 text-center text-sm`}
        >
            {t(transKeys.editor.panels.layers.tabs.windows.emptyState)}
        </p>
    );

    const frameData = selected[0];

    if (selected.length === 0 || !frameData) {
        return emptyState;
    }

    const closeWindowsTab = () => {
        editorEngine.state.leftPanelTab = null;
    };

    return (
        <div className={`${WIDTH} flex flex-col`}>
            <div className="flex flex-row items-center justify-between px-3 py-2">
                <p className="text-foreground-primary text-sm">Window Settings</p>
                <Button
                    onClick={closeWindowsTab}
                    variant="ghost"
                    size="icon"
                    className="hover:bg-background-tertiary/20 hover:border-border h-fit w-fit hover:border hover:text-white focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none active:border-0"
                >
                    <Icons.CrossL className="h-4 min-h-4 w-4 min-w-4" />
                </Button>
            </div>
            <Separator />
            <div className="flex flex-col gap-2 p-3">
                <FrameDimensions frameId={frameData.frame.id} />
                <Separator />
                <DeviceSettings frameId={frameData.frame.id} />
            </div>
        </div>
    );
});
