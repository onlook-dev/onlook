import { InputSeparator } from './separator';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { useEditorEngine } from '@/components/store/editor';
import { computeWindowMetadata, getDeviceType } from '@onlook/utility';
import { Orientation } from '@onlook/constants';
import { LeftPanelTabValue, type WindowMetadata } from '@onlook/models';
import { useEffect, useMemo, useState } from 'react';
import { observer } from 'mobx-react-lite';

export const WindowsSelected = observer(() => {
    const editorEngine = useEditorEngine();
    const frameData = editorEngine.frames.selected?.[0];


    const [metadata, setMetadata] = useState<WindowMetadata>(() =>
        computeWindowMetadata(
            frameData?.frame.dimension.width.toString() ?? '0',
            frameData?.frame.dimension.height.toString() ?? '0'
        )
    );

    useEffect(() => {
        setMetadata(computeWindowMetadata(frameData?.frame.dimension.width.toString() ?? '0', frameData?.frame.dimension.height.toString() ?? '0'));
    }, [frameData?.frame.dimension.width, frameData?.frame.dimension.height]);

    const deviceType = useMemo(() => getDeviceType(metadata.device), [metadata.device]);

    const DeviceIcon = () => {
        switch (deviceType) {
            case 'Phone':
                return <Icons.Mobile className="h-3.5 w-3.5 min-h-3.5 min-w-3.5" />;
            case 'Desktop':
            case 'Laptop':
            case 'Tablet':
                return <Icons.Desktop className="h-3.5 w-3.5 min-h-3.5 min-w-3.5" />;
            default:
                return <CustomIcon />;
        }
    };

    const CustomIcon = () => {
        return metadata.orientation === Orientation.Landscape ? (
            <Icons.Landscape className="h-3.5 w-3.5 min-h-3.5 min-w-3.5" />
        ) : (
            <Icons.Portrait className="h-3.5 w-3.5 min-h-3.5 min-w-3.5" />
        );
    };

    const openWindowsTabs = () => {
        editorEngine.state.leftPanelTab = LeftPanelTabValue.WINDOWS;
    };

    return (
        <div className="flex items-center justify-center gap-0.5 w-full overflow-hidden">
            <Button
                variant="ghost"
                size="toolbar"
                className="flex items-center gap-2 text-muted-foreground border border-border/0 cursor-pointer rounded-lg hover:bg-background-tertiary/20 hover:text-white hover:border hover:border-border focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus-visible:outline-none active:border-0"
                onClick={openWindowsTabs}
            >
                <DeviceIcon />
                <span className="font-medium">{deviceType}</span>
            </Button>

            <InputSeparator />
            <Button
                variant="ghost"
                size="icon"
                className="flex items-center text-muted-foreground border border-border/0 cursor-pointer rounded-lg hover:bg-background-tertiary/20 hover:text-white hover:border hover:border-border focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus-visible:outline-none active:border-0"
                onClick={() =>
                    frameData?.frame.id && editorEngine.frames.duplicate(frameData.frame.id)
                }
            >
                <Icons.Copy className="h-4 w-4 min-h-4 min-w-4" />
            </Button>
            {editorEngine.frames.canDelete() && (
                <>
                    <InputSeparator />
                    <Button
                        variant="ghost"
                        size="icon"
                        className="flex items-center text-muted-foreground border border-border/0 cursor-pointer rounded-lg hover:bg-background-tertiary/20 hover:text-white hover:border hover:border-border focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus-visible:outline-none active:border-0"
                        disabled={!editorEngine.frames.canDelete()}
                        onClick={() =>
                            frameData?.frame.id && editorEngine.frames.delete(frameData.frame.id)
                        }
                    >
                        <Icons.Trash className="h-4 w-4 min-h-4 min-w-4" />
                    </Button>
                </>
            )}
        </div>
    );
}
)