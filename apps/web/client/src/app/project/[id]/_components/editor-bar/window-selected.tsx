import { useEditorEngine } from '@/components/store/editor';
import { Orientation } from '@onlook/constants';
import { LeftPanelTabValue, type WindowMetadata } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { computeWindowMetadata, getDeviceType } from '@onlook/utility';
import { observer } from 'mobx-react-lite';
import { useEffect, useMemo, useState } from 'react';
import { InputSeparator } from './separator';

export const WindowsSelected = observer(() => {
    const editorEngine = useEditorEngine();
    const frameData = editorEngine.frames.selected?.[0];
    const [isDuplicating, setIsDuplicating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

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

    const duplicateWindow = async () => {
        setIsDuplicating(true);
        try {
            if (frameData?.frame.id) {
                await editorEngine.frames.duplicate(frameData.frame.id);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsDuplicating(false);
        }
    };

    const deleteWindow = async () => {
        setIsDeleting(true);
        try {
            if (frameData?.frame.id) {
                await editorEngine.frames.delete(frameData.frame.id);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsDeleting(false);
        }
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
                className="flex items-center text-muted-foreground border border-border/0 cursor-pointer rounded-lg hover:bg-background-tertiary/20 hover:text-white hover:border hover:border-border focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus-visible:outline-none active:border-0"
                onClick={duplicateWindow}
                disabled={isDuplicating}
            >
                {isDuplicating ? (
                    <Icons.LoadingSpinner className="size-4 min-size-4 animate-spin" />
                ) : (
                    <Icons.Copy className="size-4 min-size-4" />
                )}
                Duplicate
            </Button>
            {editorEngine.frames.canDelete() && (
                <>
                    <InputSeparator />
                    <Button
                        variant="ghost"
                        className="flex items-center text-muted-foreground border border-border/0 cursor-pointer rounded-lg hover:bg-background-tertiary/20 hover:text-white hover:border hover:border-border focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus-visible:outline-none active:border-0"
                        disabled={!editorEngine.frames.canDelete() || isDeleting}
                        onClick={deleteWindow}
                    >
                        {isDeleting ? (
                            <Icons.LoadingSpinner className="size-4 min-size-4 animate-spin" />
                        ) : (
                            <Icons.Trash className="size-4 min-size-4" />
                        )}
                        Delete
                    </Button>
                </>
            )}
        </div>
    );
}
)