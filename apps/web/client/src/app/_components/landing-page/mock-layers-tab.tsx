import React from 'react';
import { cn } from '@onlook/ui/utils';
import { NodeIcon } from '../../project/[id]/_components/left-panel/layers-tab/tree/node-icon';

// Mock data for layers with nested structure
const mockLayers = [
    { id: '1', name: 'Navigation Bar', tagName: 'COMPONENT', selected: false, level: 0, isInstance: false },
    { id: '2', name: 'Logo', tagName: 'IMG', selected: false, level: 1, isInstance: false },
    { id: '3', name: 'Menu Items', tagName: 'DIV', selected: false, level: 1, isInstance: false },
    { id: '4', name: 'Home', tagName: 'A', selected: false, level: 2, isInstance: false },
    { id: '5', name: 'Projects', tagName: 'A', selected: false, level: 2, isInstance: false },
    { id: '6', name: 'About', tagName: 'A', selected: false, level: 2, isInstance: false },
    { id: '7', name: 'Overview', tagName: 'SECTION', selected: true, level: 0, isInstance: false },
    { id: '8', name: 'Hero Section', tagName: 'DIV', selected: false, level: 1, isInstance: false },
    { id: '9', name: 'Heading', tagName: 'H1', selected: false, level: 2, isInstance: false },
    { id: '10', name: 'Description', tagName: 'P', selected: false, level: 2, isInstance: false },
    { id: '11', name: 'Projects Section', tagName: 'SECTION', selected: false, level: 0, isInstance: false },
    { id: '12', name: 'Filter Bar', tagName: 'DIV', selected: false, level: 1, isInstance: false },
    { id: '13', name: 'Search', tagName: 'INPUT', selected: false, level: 2, isInstance: false },
    { id: '14', name: 'Project Grid', tagName: 'DIV', selected: false, level: 1, isInstance: false },
    { id: '15', name: 'Project Card', tagName: 'COMPONENT', selected: false, level: 2, isInstance: true },
    { id: '16', name: 'Project Image', tagName: 'IMG', selected: false, level: 3, isInstance: false },
    { id: '17', name: 'Project Title', tagName: 'H3', selected: false, level: 3, isInstance: false },
];

export function MockLayersTab() {
    const [hoveredId, setHoveredId] = React.useState<string | null>(null);
    const [selectedId, setSelectedId] = React.useState<string>('7');

    return (
        <div className="w-72 shadow-lg p-2 overflow-hidden max-h-96 flex flex-col gap-1">
            <div className="flex flex-col gap-0.5">
                {mockLayers.map((layer) => {
                    const isComponent = layer.tagName === 'COMPONENT';
                    const isSelected = selectedId === layer.id;
                    const isHovered = hoveredId === layer.id;

                    return (
                        <div
                            key={layer.id}
                            className={cn(
                                'flex items-center h-5.5 px-2 cursor-pointer transition-colors select-none text-xs',
                                // Component styling
                                isComponent && !layer.isInstance && !isHovered && 'text-purple-600 dark:text-purple-300',
                                isComponent && !layer.isInstance && isHovered && 'text-purple-500 bg-purple-800/50 dark:text-purple-200',
                                isComponent && !layer.isInstance && isSelected && 'bg-purple-500 dark:bg-purple-500/90 text-white dark:text-primary',
                                // Instance styling
                                layer.isInstance && isSelected && 'text-purple-100 dark:text-purple-100 bg-purple-700/70 dark:bg-purple-500/50',
                                layer.isInstance && !isSelected && 'text-purple-500 dark:text-purple-300',
                                layer.isInstance && !isSelected && isHovered && 'text-purple-800 dark:text-purple-200 bg-purple-400/30 dark:bg-purple-900/60',
                                // Regular selection styling
                                !isComponent && !layer.isInstance && isSelected && 'bg-[#FA003C] dark:bg-[#FA003C]/90 text-white dark:text-primary',
                                !isComponent && !layer.isInstance && isHovered && !isSelected && 'bg-background-onlook text-foreground-onlook',
                                !isComponent && !layer.isInstance && !isSelected && !isHovered && 'text-foreground-onlook',
                                // Rounded corners
                                isHovered && !isSelected && 'rounded',
                                isSelected && 'rounded',
                            )}
                            onMouseEnter={() => setHoveredId(layer.id)}
                            onMouseLeave={() => setHoveredId(null)}
                            onClick={() => setSelectedId(layer.id)}
                            style={{ userSelect: 'none' }}
                        >
                            <div style={{ width: `${layer.level * 16}px` }} />
                            <NodeIcon iconClass="w-3.5 h-3.5 mr-1.5" tagName={layer.tagName} />
                            <span className="truncate">{layer.name}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
} 