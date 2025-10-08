import { useEditorEngine } from '@/components/store/editor';
import { DefaultSettings, DEVICE_OPTIONS, Orientation } from '@onlook/constants';
import type { WindowMetadata } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from '@onlook/ui/select';
import { computeWindowMetadata } from '@onlook/utility';
import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';

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

    const [device, setDevice] = useState(() => {
        for (const category in DEVICE_OPTIONS) {
            for (const deviceName in DEVICE_OPTIONS[category]) {
                const res = DEVICE_OPTIONS[category][deviceName];
                if (res === `${metadata.width}x${metadata.height}`) {
                    return `${category}:${deviceName}`;
                }
            }
        }
        return 'Custom:Custom';
    });

    const updateFrame = (width: number, height: number) => {
        const roundedWidth = Math.round(width);
        const roundedHeight = Math.round(height);

        const newMetadata = computeWindowMetadata(roundedWidth.toString(), roundedHeight.toString());
        setMetadata(newMetadata);

        editorEngine.frames.updateAndSaveToStorage(frameData.frame.id, { dimension: { width: roundedWidth, height: roundedHeight } });
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

    const handleDeviceChange = (value: string) => {
        setDevice(value);
        const [category, deviceName] = value.split(':');
        if (
            category &&
            deviceName &&
            DEVICE_OPTIONS[category] &&
            DEVICE_OPTIONS[category][deviceName] &&
            deviceName !== 'Custom'
        ) {
            const [w, h] = DEVICE_OPTIONS[category][deviceName].split('x').map(Number);
            if (typeof w === 'number' && !isNaN(w) && typeof h === 'number' && !isNaN(h)) {
                updateFrame(w, h);
            }
        }
    };

    return (
        <div className="flex flex-col gap-2">
            <p className="text-sm text-foreground-primary">Frame Dimensions</p>
            <div className="flex flex-row justify-between items-center">
                <span className="text-xs text-foreground-secondary">Device</span>
                <Select value={device} onValueChange={handleDeviceChange}>
                    <SelectTrigger className="w-3/5 bg-background-secondary border-background-secondary py-1.5 px-2 h-fit text-xs rounded focus:outline-none focus:ring-0">
                        <SelectValue placeholder="Select device" />
                    </SelectTrigger>
                    <SelectContent className="rounded-md bg-background-secondary">
                        {Object.entries(DEVICE_OPTIONS).map(([category, devices], index) =>
                            category !== 'Custom' ? (
                                <React.Fragment key={index}>
                                    <SelectGroup key={index}>
                                        <SelectLabel>{category}</SelectLabel>
                                        {Object.entries(devices).map(([deviceName], idx) => (
                                            <SelectItem
                                                key={idx}
                                                value={category + ':' + deviceName}
                                                className="focus:bg-background-tertiary rounded-md text-xs cursor-pointer"
                                            >
                                                {deviceName}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                    {index < Object.entries(DEVICE_OPTIONS).length - 1 && (
                                        <SelectSeparator className="text-white" />
                                    )}
                                </React.Fragment>
                            ) : (
                                <SelectItem
                                    key={'Custom'}
                                    value={'Custom:Custom'}
                                    className="focus:bg-background-tertiary rounded-md text-xs cursor-pointer"
                                >
                                    {'Custom'}
                                </SelectItem>
                            ),
                        )}
                    </SelectContent>
                </Select>
            </div>

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
