'use client';

import { Icons } from '@onlook/ui/icons';
import * as React from 'react';
import { PanelButton } from './button';

export const ViewButtons = () => {
    const [activeView, setActiveView] = React.useState<'text' | 'grid'>('text');

    return (
        <div className="ml-auto flex items-center gap-1">
            <PanelButton
                icon={Icons.Text}
                isActive={activeView === 'text'}
                onClick={() => setActiveView('text')}
            />
            <PanelButton
                icon={Icons.ViewGrid}
                isActive={activeView === 'grid'}
                onClick={() => setActiveView('grid')}
            />
        </div>
    );
};
