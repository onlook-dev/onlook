'use client';

import React from 'react';
import { useEditorEngine } from '@/components/store/editor';
import { Icons } from '@onlook/ui/icons';
import { Button } from '@onlook/ui/button';
import { observer } from 'mobx-react-lite';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger } from '@onlook/ui/select';
import { DEVICE_OPTIONS } from '@onlook/constants';
import { computeWindowMetadata } from '@onlook/utility';
import { SystemTheme } from '@onlook/models/assets';
import { InputSeparator } from './separator';
import { useState } from 'react';
import { useDropdownControl } from './hooks/use-dropdown-manager';
import { useMeasureGroup } from './hooks/use-measure-group';
import { OverflowMenu } from './overflow-menu';

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

export const WindowSelected = observer(({ availableWidth = 0 }: { availableWidth?: number }) => {
    const editorEngine = useEditorEngine();
    const { isOpen, onOpenChange } = useDropdownControl({
        id: 'window-selected-overflow-dropdown',
        isOverflow: true
    });
    const { visibleCount } = useMeasureGroup({ 
        availableWidth, 
        count: 4 // Number of groups
    });

    const frameData = editorEngine.frames.selected[0];

    // Only show toolbar when a window is selected
    if (!frameData) return null;

    const handleThemeChange = async (theme: SystemTheme) => {
        await frameData.view.setTheme(theme);
    };

    const groups = [
        {
            key: 'window-actions',
            label: 'Window Actions',
            components: [
                <Tooltip key="duplicate">
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                                editorEngine.frames.duplicate(frameData.frame.id);
                            }}
                        >
                            <Icons.Copy className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Duplicate Window</TooltipContent>
                </Tooltip>,
                <Tooltip key="delete">
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            disabled={!editorEngine.frames.canDelete()}
                            onClick={() => {
                                editorEngine.frames.delete(frameData.frame.id);
                            }}
                        >
                            <Icons.Trash className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Delete Window</TooltipContent>
                </Tooltip>
            ]
        },
        {
            key: 'device',
            label: 'Device',
            components: [
                <DeviceSelector key="device" />
            ]
        },
        {
            key: 'theme',
            label: 'Theme',
            components: [
                <Tooltip key="system">
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleThemeChange(SystemTheme.SYSTEM)}
                        >
                            <Icons.Desktop className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">System Theme</TooltipContent>
                </Tooltip>,
                <Tooltip key="light">
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleThemeChange(SystemTheme.LIGHT)}
                        >
                            <Icons.Sun className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Light Theme</TooltipContent>
                </Tooltip>,
                <Tooltip key="dark">
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleThemeChange(SystemTheme.DARK)}
                        >
                            <Icons.Moon className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Dark Theme</TooltipContent>
                </Tooltip>
            ]
        },
        {
            key: 'rotate',
            label: 'Rotate',
            components: [
                <Tooltip key="rotate">
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                                const { width, height } = frameData.frame.dimension;
                                frameData.frame.dimension.width = height;
                                frameData.frame.dimension.height = width;
                            }}
                        >
                            <Icons.CounterClockwiseClock className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Rotate Device</TooltipContent>
                </Tooltip>
            ]
        }
    ];

    const visibleGroups = groups.slice(0, visibleCount);
    const overflowGroups = groups.slice(visibleCount);

    return (
        <div className="flex items-center gap-1 p-1 px-1.5 bg-background-secondary/85 dark:bg-background/85 backdrop-blur rounded-lg drop-shadow-xl">
            {visibleGroups.map((group, groupIdx) => (
                <React.Fragment key={group.key}>
                    {groupIdx > 0 && <InputSeparator />}
                    <div className="flex items-center gap-0.5">
                        {group.components.map((comp, idx) => (
                            <React.Fragment key={idx}>{comp}</React.Fragment>
                        ))}
                    </div>
                </React.Fragment>
            ))}
            {overflowGroups.length > 0 && (
                <OverflowMenu
                    isOpen={isOpen}
                    onOpenChange={onOpenChange}
                    overflowGroups={overflowGroups}
                    visibleCount={visibleCount}
                />
            )}
        </div>
    );
}); 