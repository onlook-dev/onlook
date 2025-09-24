import React from 'react';

import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';

import { NodeIcon } from '../../../project/[id]/_components/left-panel/layers-tab/tree/node-icon';
import { Illustrations } from '../illustrations';

// Mock data for layers with nested structure
const mockLayers = [
    {
        id: '2',
        name: 'Navigation Bar',
        tagName: 'COMPONENT',
        selected: false,
        level: 0,
        isInstance: false,
    },
    { id: '2.1', name: 'Models', tagName: 'DIV', selected: false, level: 1, isInstance: false },
    { id: '2.1.1', name: 'Exotic', tagName: 'SPAN', selected: false, level: 2, isInstance: false },
    {
        id: '2.1.2',
        name: 'Roadster',
        tagName: 'SPAN',
        selected: false,
        level: 2,
        isInstance: false,
    },
    {
        id: '2.1.3',
        name: 'Terrestrial',
        tagName: 'SPAN',
        selected: false,
        level: 2,
        isInstance: false,
    },
    { id: '2.2', name: 'Logo', tagName: 'IMG', selected: false, level: 1, isInstance: false },
    { id: '2.3', name: 'Reserve', tagName: 'SPAN', selected: false, level: 1, isInstance: false },
    { id: '3', name: 'Header', tagName: 'Section', selected: true, level: 0, isInstance: false },
    { id: '4.1', name: 'Endorphins', tagName: 'H1', selected: false, level: 1, isInstance: false },
    { id: '4.2', name: 'In Motion', tagName: 'H1', selected: false, level: 1, isInstance: false },
    {
        id: '4.3',
        name: 'Order Now',
        tagName: 'BUTTON',
        selected: false,
        level: 1,
        isInstance: false,
    },
    { id: '4.4', name: 'Video', tagName: 'VIDEO', selected: false, level: 1, isInstance: false },
    { id: '5', name: 'Section', tagName: 'Section', selected: false, level: 0, isInstance: false },
    {
        id: '5.1',
        name: 'Experience excellence',
        tagName: 'H2',
        selected: false,
        level: 1,
        isInstance: false,
    },
    {
        id: '5.2',
        name: 'The feel of something more',
        tagName: 'P',
        selected: false,
        level: 1,
        isInstance: false,
    },
];

function MockLayersTab() {
    const [hoveredId, setHoveredId] = React.useState<string | null>(null);
    const [selectedId, setSelectedId] = React.useState<string>('3');

    return (
        <div className="flex max-h-96 w-72 flex-col gap-1 overflow-hidden p-2 shadow-lg">
            <div className="flex flex-col gap-0.5">
                {mockLayers.map((layer) => {
                    const isComponent = layer.tagName === 'COMPONENT';
                    const isSelected = selectedId === layer.id;
                    const isHovered = hoveredId === layer.id;

                    return (
                        <div
                            key={layer.id}
                            className={cn(
                                'flex h-5.5 cursor-pointer items-center px-2 text-xs transition-colors select-none',
                                // Component styling
                                isComponent &&
                                    !layer.isInstance &&
                                    !isHovered &&
                                    'text-purple-600 dark:text-purple-300',
                                isComponent &&
                                    !layer.isInstance &&
                                    isHovered &&
                                    'bg-purple-800/50 text-purple-500 dark:text-purple-200',
                                isComponent &&
                                    !layer.isInstance &&
                                    isSelected &&
                                    'dark:text-primary bg-purple-500 text-white dark:bg-purple-500/90',
                                // Instance styling
                                layer.isInstance &&
                                    isSelected &&
                                    'bg-purple-700/70 text-purple-100 dark:bg-purple-500/50 dark:text-purple-100',
                                layer.isInstance &&
                                    !isSelected &&
                                    'text-purple-500 dark:text-purple-300',
                                layer.isInstance &&
                                    !isSelected &&
                                    isHovered &&
                                    'bg-purple-400/30 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200',
                                // Regular selection styling
                                !isComponent &&
                                    !layer.isInstance &&
                                    isSelected &&
                                    'dark:text-primary bg-[#FA003C] text-white dark:bg-[#FA003C]/90',
                                !isComponent &&
                                    !layer.isInstance &&
                                    isHovered &&
                                    !isSelected &&
                                    'bg-background-onlook text-foreground-onlook',
                                !isComponent &&
                                    !layer.isInstance &&
                                    !isSelected &&
                                    !isHovered &&
                                    'text-foreground-onlook',
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

export function LayersBlock() {
    return (
        <div className="flex flex-col gap-4">
            <div className="bg-background-onlook/80 relative mb-6 h-100 w-full overflow-hidden rounded-lg">
                <div className="border-foreground-primary/20 absolute top-12 left-1/30 z-20 flex h-100 w-48 flex-col items-center justify-start overflow-hidden rounded-xl border-[0.5px] bg-black/85 backdrop-blur-2xl">
                    <p className="text-foreground-primary text-regular border-foreground-primary/20 w-full border-b-[0.5px] px-3 py-2 text-left font-light">
                        Layers
                    </p>
                    <div className="flex w-full flex-row items-start gap-8">
                        <MockLayersTab />
                    </div>
                </div>
                <div className="absolute top-20 left-1/4 z-10 h-80 w-90 overflow-hidden rounded-lg">
                    <video
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="h-full w-full rounded-lg object-cover"
                    >
                        <source src="/assets/layers-car.mp4" type="video/mp4" />
                        Your browser does not support the video tag.
                    </video>
                    <div className="absolute top-0 left-0 flex h-full w-full flex-col items-center justify-start">
                        <div className="absolute top-1.5 left-0 flex h-6 w-full flex-row items-center justify-between gap-4 bg-gray-800/80 px-2">
                            <Illustrations.LayersLogo className="ml-34 h-2" />
                            <Illustrations.LayersReserve className="h-1" />
                        </div>
                        <div className="absolute top-10 left-5 flex h-12 w-full flex-row items-center justify-center gap-4">
                            <Illustrations.LayersEndorphins className="w-56" />
                            <Illustrations.LayersInMotion className="absolute top-12 w-48" />
                        </div>
                        <div className="absolute bottom-3 flex h-fit w-fit cursor-pointer flex-col items-center justify-start bg-[#872D2D] p-2 transition-colors duration-300 hover:bg-red-600">
                            <Illustrations.LayersOrderNow className="w-18" />
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex w-full flex-row items-start gap-8">
                {/* Icon + Title */}
                <div className="flex w-1/2 flex-col items-start">
                    <div className="mb-2">
                        <Icons.Layers className="text-foreground-primary h-6 w-6" />
                    </div>
                    <span className="text-foreground-primary text-largePlus font-light">
                        Layers
                    </span>
                </div>
                {/* Description */}
                <p className="text-foreground-secondary text-regular w-1/2 text-balance">
                    Select elements with precision and control.
                </p>
            </div>
        </div>
    );
}
