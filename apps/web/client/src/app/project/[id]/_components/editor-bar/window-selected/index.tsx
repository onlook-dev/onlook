'use client';

import { useEditorEngine } from '@/components/store/editor';
import { SystemTheme } from '@onlook/models/assets';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useDropdownControl } from '../hooks/use-dropdown-manager';
import { useMeasureGroup } from '../hooks/use-measure-group';
import { OverflowMenu } from '../overflow-menu';
import { InputSeparator } from '../separator';
import { DeviceSelector } from './device-selector';
import { RotateGroup } from './rotate-group';
import { ThemeGroup } from './theme-group';
import { WindowActionsGroup } from './window-actions-group';

export const WindowSelected = observer(({ availableWidth = 0 }: { availableWidth?: number }) => {
    const editorEngine = useEditorEngine();
    const { isOpen, onOpenChange } = useDropdownControl({
        id: 'window-selected-overflow-dropdown',
        isOverflow: true
    });
    const { visibleCount } = useMeasureGroup({
        availableWidth,
        count: 4
    });

    const frameData = editorEngine.frames.selected[0];

    // Only show toolbar when a window is selected
    if (!frameData) return null;

    const handleThemeChange = async (theme: SystemTheme) => {
        await frameData.view.setTheme(theme);
    };

    const groups = [
        {
            key: 'device',
            label: 'Device',
            components: [
                <DeviceSelector key="device" />
            ]
        },
        {
            key: 'window-actions',
            label: 'Window Actions',
            components: [
                <WindowActionsGroup key="window-actions" frameData={frameData} />
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