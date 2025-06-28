import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useEditorEngine } from '@/components/store/editor';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger } from '@onlook/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { DEVICE_OPTIONS } from '@onlook/constants';
import { computeWindowMetadata } from '@onlook/utility';
import { Icons } from '@onlook/ui/icons';

// Helper to get the appropriate device icon
function getDeviceIcon(category: string, dimensions: string) {
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
}

/**
 * DeviceSelector component for selecting device presets or custom dimensions.
 */
export const DeviceSelector = observer(() => {
    const editorEngine = useEditorEngine();
    const frameData = editorEngine.frames.selected[0];
    const [device, setDevice] = useState(() => {
        if (!frameData) return 'Custom:Custom';
        const metadata = computeWindowMetadata(
            frameData.frame.dimension.width.toString(),
            frameData.frame.dimension.height.toString()
        );
        for (const category in DEVICE_OPTIONS) {
            if (DEVICE_OPTIONS.hasOwnProperty(category)) {
                const devices = DEVICE_OPTIONS[category as keyof typeof DEVICE_OPTIONS];
                for (const deviceName in devices) {
                    if (devices.hasOwnProperty(deviceName)) {
                        const res = devices[deviceName];
                        if (res === `${metadata.width}x${metadata.height}`) {
                            return `${category}:${deviceName}`;
                        }
                    }
                }
            }
        }
        return 'Custom:Custom';
    });

    if (!frameData) return null;

    const handleDeviceChange = (value: string) => {
        const [category, deviceName] = value.split(':');
        setDevice(value);
        if (!deviceName) return;
        if (category === 'Custom') {
            // Reset to default dimensions
            frameData.frame.dimension.width = 1536;
            frameData.frame.dimension.height = 960;
            return;
        }
        const categoryKey = category as keyof typeof DEVICE_OPTIONS;
        const devices = DEVICE_OPTIONS[categoryKey];
        if (!devices || !devices.hasOwnProperty(deviceName)) return;
        const dimensionString = devices[deviceName];
        if (!dimensionString) return;
        const [widthStr, heightStr] = dimensionString.split('x');
        if (!widthStr || !heightStr) return;
        const width = parseInt(widthStr);
        const height = parseInt(heightStr);
        if (isNaN(width) || isNaN(height)) return;
        frameData.frame.dimension.width = width;
        frameData.frame.dimension.height = height;
    };

    return (
        <Select value={device} onValueChange={handleDeviceChange}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <SelectTrigger className="w-[180px] h-8 text-xs bg-transparent border-none hover:bg-background-tertiary/20 focus:ring-0">
                        <div className="flex items-center w-full">
                            {(() => {
                                const [category, name] = device.split(':');
                                if (!category || !name) return <span>Custom</span>;
                                const categoryKey = category as keyof typeof DEVICE_OPTIONS;
                                const dimensions = DEVICE_OPTIONS[categoryKey]?.[name];
                                return (
                                    <>
                                        {getDeviceIcon(category, dimensions || '')}
                                        <span className="truncate">
                                            {name} {dimensions ? `(${dimensions})` : ''}
                                        </span>
                                    </>
                                );
                            })()}
                        </div>
                    </SelectTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom">Device</TooltipContent>
            </Tooltip>
            <SelectContent>
                <SelectGroup>
                    <SelectLabel className="text-xs">Custom</SelectLabel>
                    <SelectItem value="Custom:Custom" className="text-xs flex items-center">
                        {getDeviceIcon('Custom', `${frameData.frame.dimension.width}x${frameData.frame.dimension.height}`)}
                        Custom ({frameData.frame.dimension.width}x{frameData.frame.dimension.height})
                    </SelectItem>
                    <SelectSeparator />
                </SelectGroup>
                {Object.entries(DEVICE_OPTIONS).map(([category, devices]) => (
                    <SelectGroup key={category}>
                        <SelectLabel className="text-xs">{category}</SelectLabel>
                        {Object.entries(devices).map(([name, dimensions]) => (
                            <SelectItem
                                key={`${category}:${name}`}
                                value={`${category}:${name}`}
                                className="text-xs flex items-center"
                            >
                                {getDeviceIcon(category, dimensions)}
                                {name} ({dimensions})
                            </SelectItem>
                        ))}
                        <SelectSeparator />
                    </SelectGroup>
                ))}
            </SelectContent>
        </Select>
    );
}); 