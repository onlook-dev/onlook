'use client';

import { useEditorEngine } from '@/components/store/editor';
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
    const frameData = editorEngine.frames.selected[0];
    const { isOpen, onOpenChange } = useDropdownControl({
        id: 'window-selected-overflow-dropdown',
        isOverflow: true
    });
    if (!frameData) return null;

    const WINDOW_GROUPS = [
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

    const { visibleCount } = useMeasureGroup({
        availableWidth,
        count: WINDOW_GROUPS.length
    });
    const visibleGroups = WINDOW_GROUPS.slice(0, visibleCount);
    const overflowGroups = WINDOW_GROUPS.slice(visibleCount);

    return (
        <div className="flex items-center justify-center gap-0.5 w-full overflow-hidden">
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
            <OverflowMenu
                isOpen={isOpen}
                onOpenChange={onOpenChange}
                overflowGroups={overflowGroups}
                visibleCount={visibleCount}
            />
        </div>
    );
}); 