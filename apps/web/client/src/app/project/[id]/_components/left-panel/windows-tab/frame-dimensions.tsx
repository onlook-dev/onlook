import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';

import type { WindowMetadata } from '@onlook/models';
import { DefaultSettings, DEVICE_OPTIONS, Orientation } from '@onlook/constants';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectSeparator,
    SelectTrigger,
    SelectValue,
} from '@onlook/ui/select';
import { computeWindowMetadata } from '@onlook/utility';

import { useEditorEngine } from '@/components/store/editor';

export const FrameDimensions = observer(({ frameId }: { frameId: string }) => {
    const editorEngine = useEditorEngine();
    const frameData = editorEngine.frames.get(frameId);

    if (!frameData) {
        return <p className="text-foreground-primary text-sm">Frame not found</p>;
    }

    const [metadata, setMetadata] = useState<WindowMetadata>(() =>
        computeWindowMetadata(
            frameData.frame.dimension.width.toString(),
            frameData.frame.dimension.height.toString(),
        ),
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

        const newMetadata = computeWindowMetadata(
            roundedWidth.toString(),
            roundedHeight.toString(),
        );
        setMetadata(newMetadata);

        editorEngine.frames.updateAndSaveToStorage(frameData.frame.id, {
            dimension: { width: roundedWidth, height: roundedHeight },
        });
    };

    const handleDimensionInput = (
        event: React.ChangeEvent<HTMLInputElement>,
        dimension: 'width' | 'height',
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
            DEVICE_OPTIONS[category]?.[deviceName] &&
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
            <p className="text-foreground-primary text-sm">Frame Dimensions</p>
            <div className="flex flex-row items-center justify-between">
                <span className="text-foreground-secondary text-xs">Device</span>
                <Select value={device} onValueChange={handleDeviceChange}>
                    <SelectTrigger className="bg-background-secondary border-background-secondary h-fit w-3/5 rounded px-2 py-1.5 text-xs focus:ring-0 focus:outline-none">
                        <SelectValue placeholder="Select device" />
                    </SelectTrigger>
                    <SelectContent className="bg-background-secondary rounded-md">
                        {Object.entries(DEVICE_OPTIONS).map(([category, devices], index) =>
                            category !== 'Custom' ? (
                                <React.Fragment key={index}>
                                    <SelectGroup key={index}>
                                        <SelectLabel>{category}</SelectLabel>
                                        {Object.entries(devices).map(([deviceName], idx) => (
                                            <SelectItem
                                                key={idx}
                                                value={category + ':' + deviceName}
                                                className="focus:bg-background-tertiary cursor-pointer rounded-md text-xs"
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
                                    className="focus:bg-background-tertiary cursor-pointer rounded-md text-xs"
                                >
                                    {'Custom'}
                                </SelectItem>
                            ),
                        )}
                    </SelectContent>
                </Select>
            </div>

            <div className="flex flex-row items-center justify-between">
                <span className="text-foreground-secondary text-xs">Orientation</span>
                <div className="bg-background-secondary flex w-3/5 flex-row rounded p-0.5">
                    <Button
                        size={'icon'}
                        className={`bg-background-secondary h-full flex-1 rounded-sm px-0.5 py-1.5 ${metadata.orientation === Orientation.Portrait ? 'bg-background-tertiary hover:bg-background-tertiary' : 'hover:bg-background-tertiary/50'}`}
                        variant={'ghost'}
                        onClick={handleOrientationChange}
                    >
                        <Icons.Portrait
                            className={`h-4 w-4 ${metadata.orientation !== Orientation.Portrait ? 'text-foreground-secondary hover:text-foreground-onlook' : ''}`}
                        />
                    </Button>
                    <Button
                        size={'icon'}
                        className={`bg-background-secondary h-full flex-1 rounded-sm px-0.5 py-1.5 ${metadata.orientation === Orientation.Landscape ? 'bg-background-tertiary hover:bg-background-tertiary' : 'hover:bg-background-tertiary/50'}`}
                        variant={'ghost'}
                        onClick={handleOrientationChange}
                    >
                        <Icons.Landscape
                            className={`h-4 w-4 ${metadata.orientation !== Orientation.Landscape ? 'text-foreground-secondary hover:text-foreground-onlook' : ''}`}
                        />
                    </Button>
                </div>
            </div>

            <div className="relative flex flex-row items-center justify-between">
                <span className="text-foreground-secondary text-xs">Width</span>
                <div className="relative w-3/5">
                    <Input
                        className="text-foreground-active bg-background-secondary h-8 w-full [appearance:textfield] rounded border-none px-2 text-start text-xs focus:ring-0 focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        value={metadata.width}
                        min={parseInt(DefaultSettings.MIN_DIMENSIONS.width)}
                        type="number"
                        onChange={(event) => handleDimensionInput(event, 'width')}
                    />
                    <p className="text-foreground-secondary absolute top-1/2 right-2 h-fit w-fit -translate-y-1/2 transform p-0 text-xs">
                        px
                    </p>
                </div>
            </div>

            <div className="relative flex flex-row items-center justify-between">
                <span className="text-foreground-secondary text-xs">Height</span>
                <div className="relative w-3/5">
                    <Input
                        className="text-foreground-active bg-background-secondary h-8 w-full [appearance:textfield] rounded border-none px-2 text-start text-xs focus:ring-0 focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        value={metadata.height}
                        min={parseInt(DefaultSettings.MIN_DIMENSIONS.height)}
                        type="number"
                        onChange={(event) => handleDimensionInput(event, 'height')}
                    />
                    <p className="text-foreground-secondary absolute top-1/2 right-2 h-fit w-fit -translate-y-1/2 transform p-0 text-xs">
                        px
                    </p>
                </div>
            </div>
        </div>
    );
});
