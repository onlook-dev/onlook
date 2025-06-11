import { useEditorEngine } from '@/components/store/editor';
import { DefaultSettings, DEVICE_OPTIONS, Orientation } from '@onlook/constants';
import type { WindowMetadata } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons/index';
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

    console.log('FrameDimensions', frameData.frame.dimension.width.toString(),
        frameData.frame.dimension.height.toString());

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
        const newMetadata = computeWindowMetadata(width.toString(), height.toString());
        setMetadata(newMetadata);
        const newFrame = { ...frameData.frame, dimension: { width, height } };
        editorEngine.frames.updateLocally(frameId, newFrame);
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
        
        if (category === 'Custom') {
            // Reset to default dimensions
            updateFrame(1536, 960);
            return;
        }

        if (category && deviceName && DEVICE_OPTIONS[category] && DEVICE_OPTIONS[category][deviceName]) {
            const [w, h] = DEVICE_OPTIONS[category][deviceName].split('x').map(Number);
            if (typeof w === 'number' && !isNaN(w) && typeof h === 'number' && !isNaN(h)) {
                updateFrame(w, h);
            }
        }
    };

    const getDeviceIcon = (category: string, dimensions: string) => {
        const [widthStr, heightStr] = dimensions.split('x');
        if (!widthStr || !heightStr) return null;

        const width = parseInt(widthStr);
        const height = parseInt(heightStr);
        if (isNaN(width) || isNaN(height)) return null;

        const isPortrait = height > width;

        switch (category) {
            case 'Phone':
                return <Icons.Mobile className="h-4 w-4 mr-2 text-foreground" />;
            case 'Tablet':
                return <Icons.Tablet className="h-4 w-4 mr-2 text-foreground" />;
            case 'Laptop':
                return <Icons.Laptop className="h-4 w-4 mr-2 text-foreground" />;
            case 'Desktop':
                return <Icons.Desktop className="h-4 w-4 mr-2 text-foreground" />;
            case 'Custom':
                return isPortrait ? <Icons.Portrait className="h-4 w-4 mr-2 text-foreground" /> : <Icons.Landscape className="h-4 w-4 mr-2 text-foreground" />;
            default:
                return null;
        }
    };

    return (
        <div className="flex flex-col gap-2">
            <p className="text-sm text-foreground-primary">Frame Dimensions</p>
            <div className="flex flex-row justify-between items-center">
                <span className="text-xs text-foreground-secondary">Device</span>
                <Select value={device} onValueChange={handleDeviceChange}>
                    <SelectTrigger className="w-3/5 bg-background-secondary border-background-secondary py-1.5 px-2 h-fit text-xs rounded focus:outline-none focus:ring-0">
                        <div className="flex items-center">
                            {(() => {
                                const [category, name] = device.split(':');
                                if (!category || !name) return <span>Custom</span>;

                                const dimensions = category === 'Custom' 
                                    ? `${metadata.width}x${metadata.height}`
                                    : DEVICE_OPTIONS[category]?.[name];

                                return (
                                    <>
                                        {getDeviceIcon(category, dimensions || '')}
                                        <span className="truncate">{name}</span>
                                    </>
                                );
                            })()}
                        </div>
                    </SelectTrigger>
                    <SelectContent className="rounded-md bg-background-secondary">
                        <SelectItem
                            value="Custom:Custom"
                            className="focus:bg-background-tertiary rounded-md text-xs cursor-pointer"
                        >
                            <div className="flex items-center">
                                {getDeviceIcon('Custom', `${metadata.width}x${metadata.height}`)}
                                <span>Custom</span>
                            </div>
                        </SelectItem>
                        <SelectSeparator className="text-white" />
                        {Object.entries(DEVICE_OPTIONS).map(([category, devices], index) =>
                            category !== 'Custom' && (
                                <React.Fragment key={index}>
                                    <SelectGroup>
                                        <SelectLabel>{category}</SelectLabel>
                                        {Object.entries(devices).map(([deviceName, dimensions], idx) => (
                                            <SelectItem
                                                key={idx}
                                                value={`${category}:${deviceName}`}
                                                className="focus:bg-background-tertiary rounded-md text-xs cursor-pointer"
                                            >
                                                <div className="flex items-center">
                                                    {getDeviceIcon(category, dimensions)}
                                                    <span>{deviceName}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                    {index < Object.entries(DEVICE_OPTIONS).length - 2 && (
                                        <SelectSeparator className="text-white" />
                                    )}
                                </React.Fragment>
                            )
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
