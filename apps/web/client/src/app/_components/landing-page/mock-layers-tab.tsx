import React from 'react';
import { cn } from '@onlook/ui/utils';
import { NodeIcon } from '../../project/[id]/_components/left-panel/layers-tab/tree/node-icon';

// Mock data for layers
const mockLayers = [
    { id: '1', name: 'Overview', tagName: 'SECTION', selected: true },
    { id: '2', name: 'Client Logo', tagName: 'IMG', selected: false },
    { id: '3', name: 'Component', tagName: 'COMPONENT', selected: false },
    { id: '4', name: 'Share', tagName: 'BUTTON', selected: false },
    { id: '5', name: 'New project', tagName: 'BUTTON', selected: false },
    { id: '6', name: 'Projects section', tagName: 'SECTION', selected: false },
    { id: '7', name: 'Controls', tagName: 'DIV', selected: false },
    { id: '8', name: 'Filter', tagName: 'INPUT', selected: false },
];

export function MockLayersTab() {
    const [hoveredId, setHoveredId] = React.useState<string | null>(null);
    const [selectedId, setSelectedId] = React.useState<string>('1');

    return (
        <div className="w-72 bg-background/80 rounded-lg shadow-lg p-2 overflow-hidden border border-border max-h-96 flex flex-col gap-1">
            <div className="flex flex-col gap-1.5">
                {mockLayers.map((layer) => (
                    <div
                        key={layer.id}
                        className={cn(
                            'flex items-center h-7 px-2 rounded cursor-pointer transition-colors select-none text-regular',
                            selectedId === layer.id
                                ? 'bg-red-500 text-foreground-primary'
                                : hoveredId === layer.id
                                ? 'bg-background-onlook text-foreground-primary'
                                : 'text-foreground-secondary',
                        )}
                        onMouseEnter={() => setHoveredId(layer.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        onClick={() => setSelectedId(layer.id)}
                        style={{ userSelect: 'none' }}
                    >
                        <NodeIcon iconClass="w-4 h-4 mr-2" tagName={layer.tagName} />
                        <span className="truncate">{layer.name}</span>
                    </div>
                ))}
            </div>
        </div>
    );
} 