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
import { InputSeparator } from '../separator';
import { useState } from 'react';
import { useDropdownControl } from '../hooks/use-dropdown-manager';
import { useMeasureGroup } from '../hooks/use-measure-group';
import { OverflowMenu } from '../overflow-menu';
import { DeviceSelector } from './device-selector';
import { WindowActionsGroup } from './window-actions-group';
import { ThemeGroup } from './theme-group';
import { RotateGroup } from './rotate-group';


export const WindowEditorBar = observer(({ availableWidth = 0 }: { availableWidth?: number }) => {
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
                <WindowActionsGroup key="window-actions" frameData={frameData} />
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
                <ThemeGroup key="theme" frameData={frameData} />
            ]
        },
        {
            key: 'rotate',
            label: 'Rotate',
            components: [
                <RotateGroup key="rotate" frameData={frameData} />
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