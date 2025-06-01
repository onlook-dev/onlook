import { useEditorEngine } from '@/components/store/editor';
import { DefaultSettings, Orientation } from '@onlook/constants';
import type { WindowMetadata } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons/index';
import { Input } from '@onlook/ui/input';
import { computeWindowMetadata } from '@onlook/utility';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';

export const FrameDimensions = observer(({ frameId }: { frameId: string }) => {

    const editorEngine = useEditorEngine();
    const frameData = editorEngine.frames.get(frameId);

    if (!frameData) {
        return (
            <p className="text-sm text-foreground-primary">Frame not found</p>
        );
    }

    const [metadata, setMetadata] = useState<WindowMetadata>(() =>
        computeWindowMetadata(
            frameData.frame.dimension.width.toString(),
            frameData.frame.dimension.height.toString()
        )
    );

    const updateFrame = (width: number, height: number) => {
        const newMetadata = computeWindowMetadata(width.toString(), height.toString());
        setMetadata(newMetadata);
        // Here you would typically call your frame update function
        console.log('Updating frame:', { width, height });
    };

    const handleDimensionInput = (
        event: React.ChangeEvent<HTMLInputElement>,
        dimension: 'width' | 'height'
    ) => {
        const value = parseInt(event.target.value);
        if (isNaN(value)) return;

        if (dimension === 'width') {
            updateFrame(value, metadata.height);
        } else {
            updateFrame(metadata.width, value);
        }
    };

    const handleOrientationChange = () => {
        if (
            metadata.width >= parseInt(DefaultSettings.MIN_DIMENSIONS.width) &&
            metadata.height >= parseInt(DefaultSettings.MIN_DIMENSIONS.height)
        ) {
            updateFrame(metadata.height, metadata.width);
        }
    };

    return (
        <div className="flex flex-col gap-2">
            <p className="text-sm text-foreground-primary">Frame Dimensions</p>

            <div className="flex flex-row justify-between items-center">
                <span className="text-xs text-foreground-secondary">Orientation</span>
                <div className="flex flex-row p-0.5 w-3/5 bg-background-secondary rounded">
                    <Button
                        size={'icon'}
                        className={`flex-1 h-full px-0.5 py-1.5 bg-background-secondary rounded-sm ${metadata.orientation === Orientation.Portrait ? 'bg-background-tertiary hover:bg-background-tertiary' : 'hover:bg-background-tertiary/50'}`}
                        variant={'ghost'}
                        onClick={handleOrientationChange}
                    >
                        <Icons.Portrait
                            className={`h-4 w-4 ${metadata.orientation !== Orientation.Portrait ? 'text-foreground-secondary hover:text-foreground-onlook' : ''}`}
                        />
                    </Button>
                    <Button
                        size={'icon'}
                        className={`flex-1 h-full px-0.5 py-1.5 bg-background-secondary rounded-sm ${metadata.orientation === Orientation.Landscape ? 'bg-background-tertiary hover:bg-background-tertiary' : 'hover:bg-background-tertiary/50'}`}
                        variant={'ghost'}
                        onClick={handleOrientationChange}
                    >
                        <Icons.Landscape
                            className={`h-4 w-4 ${metadata.orientation !== Orientation.Landscape ? 'text-foreground-secondary hover:text-foreground-onlook' : ''}`}
                        />
                    </Button>
                </div>
            </div>

            <div className="flex flex-row justify-between items-center relative">
                <span className="text-xs text-foreground-secondary">Width</span>
                <div className="relative w-3/5">
                    <Input
                        className="w-full px-2 h-8 text-xs rounded border-none text-foreground-active bg-background-secondary text-start focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        value={metadata.width}
                        min={parseInt(DefaultSettings.MIN_DIMENSIONS.width)}
                        type="number"
                        onChange={(event) => handleDimensionInput(event, 'width')}
                    />
                    <p className="p-0 h-fit w-fit absolute right-2 top-1/2 transform -translate-y-1/2 text-foreground-secondary text-xs">
                        px
                    </p>
                </div>
            </div>

            <div className="flex flex-row justify-between items-center relative">
                <span className="text-xs text-foreground-secondary">Height</span>
                <div className="relative w-3/5">
                    <Input
                        className="w-full px-2 h-8 text-xs rounded border-none text-foreground-active bg-background-secondary text-start focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        value={metadata.height}
                        min={parseInt(DefaultSettings.MIN_DIMENSIONS.height)}
                        type="number"
                        onChange={(event) => handleDimensionInput(event, 'height')}
                    />
                    <p className="p-0 h-fit w-fit absolute right-2 top-1/2 transform -translate-y-1/2 text-foreground-secondary text-xs">
                        px
                    </p>
                </div>
            </div>
        </div>
    );
});
