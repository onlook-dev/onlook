import React, { useState } from 'react';

import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';

import { NodeIcon } from '../../project/[id]/_components/left-panel/layers-tab/tree/node-icon';
import { DesignMockup, DesignMockupMobile } from './design-mockup/design-mockup';

// Notes Component for Villainstagram
function NotesComponent() {
    const notes = [
        'Implement evil pin creation (mwahaha)',
        "Add 'light mode' (begrudgingly)",
        'Build villain-to-villain messaging (evil DMs)',
        'Create villain collaboration boards',
        'Add villain lair location sharing (evil meetups)',
        'Create devious recommendation page',
    ];

    return (
        <div className="border-foreground-secondary/20 mt-10 h-fit w-96 min-w-64 rounded-lg border bg-black/80 p-3 backdrop-blur-sm">
            <div className="mb-1 flex items-center gap-2">
                <h3 className="text-foreground-secondary font-mono text-xs">
                    Villainterest - Product Notes
                </h3>
            </div>
            <div className="space-y-2">
                {notes.map((note, index) => (
                    <div key={index} className="flex items-start gap-2 text-[10px]">
                        <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gray-500"></div>
                        <span
                            className={`font-mono leading-relaxed ${index < 3 ? 'text-gray-500 line-through' : 'text-gray-300'}`}
                        >
                            {note}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// --- Chat mockup code from AiChatPreviewBlock ---
const chatMessages = [
    {
        sender: 'user',
        type: 'text',
        text: 'The masonry layout is breaking on mobile - can you fix the responsive columns?',
    },
    {
        sender: 'ai',
        type: 'text',
        text: "I see the issue! The CSS columns aren't adapting properly to smaller screens. Let me update the responsive breakpoints and add proper mobile optimization.",
    },
    {
        sender: 'ai',
        type: 'tool',
        tool: 'Generate code',
        toolName: 'generateCode',
        args: { component: 'ImageGrid', fix: 'mobile-responsive' },
    },
];
const PRESET_SENTENCE = 'Add a villain verification badge system';
function UserMessage({ text }: { text: string }) {
    return (
        <div className="group relative flex w-full flex-row justify-end px-2">
            <div className="bg-background-secondary text-foreground-secondary relative ml-8 flex w-[80%] flex-col rounded-lg rounded-br-none border-[0.5px] p-2 shadow-sm">
                <div className="text-xs font-light">{text ?? ''}</div>
            </div>
        </div>
    );
}
function AiMessage({ text }: { text: string }) {
    return (
        <div className="group relative flex w-full flex-row justify-start px-2">
            <div className="text-foreground-primary relative mr-8 flex w-[90%] flex-col rounded-lg rounded-bl-none bg-none p-1 shadow-sm">
                <div className="mt-1 text-xs leading-4.5 font-light">{text ?? ''}</div>
            </div>
        </div>
    );
}
function ToolCallDisplay({ toolName }: { toolName: string }) {
    return (
        <div className="px-2">
            <div className="relative rounded-lg border bg-black/40 backdrop-blur-lg">
                <div className="text-foreground-secondary flex items-center justify-between py-2 pl-3 transition-colors">
                    <div className="flex items-center gap-2">
                        <Icons.LoadingSpinner className="text-foreground-secondary h-4 w-4 animate-spin" />
                        <span className="animate-shimmer pointer-events-none bg-gradient-to-l from-white/20 via-white/90 to-white/20 bg-[length:200%_100%] bg-clip-text text-xs text-transparent drop-shadow-[0_0_14px_rgba(255,255,255,1)] filter select-none">
                            Website.tsx
                        </span>
                    </div>
                    <Icons.ChevronDown className="text-foreground-tertiary mr-2 h-4 w-4" />
                </div>
            </div>
        </div>
    );
}
// --- End chat mockup code ---

export function OnlookInterfaceMockup() {
    const [isVisible, setIsVisible] = useState(false);

    // Trigger animation after a delay to match jumbotron text timing
    React.useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(true);
        }, 1200); // Delay to allow jumbotron text to animate first

        return () => clearTimeout(timer);
    }, []);

    // For the mockup, the chat input is static (not interactive)
    const displayedText = PRESET_SENTENCE;
    const currentIndex = PRESET_SENTENCE.length;

    // Mock data for layers panel
    const mockLayers = [
        {
            id: '1',
            name: 'Design Mockup Container',
            tagName: 'DIV',
            selected: false,
            level: 0,
            isInstance: false,
        },
        {
            id: '1.1',
            name: 'Top Navigation Bar',
            tagName: 'COMPONENT',
            selected: false,
            level: 1,
            isInstance: false,
        },
        { id: '1.1.1', name: 'Logo', tagName: 'DIV', selected: false, level: 2, isInstance: false },
        {
            id: '1.1.2',
            name: 'Search Bar',
            tagName: 'DIV',
            selected: false,
            level: 2,
            isInstance: false,
        },
        {
            id: '1.1.2.1',
            name: 'Search Text',
            tagName: 'SPAN',
            selected: false,
            level: 3,
            isInstance: false,
        },
        {
            id: '1.1.2.2',
            name: 'Clear Button',
            tagName: 'DIV',
            selected: false,
            level: 3,
            isInstance: false,
        },
        {
            id: '1.1.3',
            name: 'User Button',
            tagName: 'DIV',
            selected: false,
            level: 2,
            isInstance: false,
        },
        {
            id: '1.2',
            name: 'Main Content',
            tagName: 'DIV',
            selected: false,
            level: 1,
            isInstance: false,
        },
        {
            id: '1.2.1',
            name: 'Left Sidebar',
            tagName: 'DIV',
            selected: false,
            level: 2,
            isInstance: false,
        },
        {
            id: '1.2.1.1',
            name: 'Navigation Icons',
            tagName: 'DIV',
            selected: false,
            level: 3,
            isInstance: false,
        },
        {
            id: '1.2.1.1.1',
            name: 'Magnifying Glass',
            tagName: 'SVG',
            selected: false,
            level: 4,
            isInstance: false,
        },
        {
            id: '1.2.1.1.2',
            name: 'Sparkles',
            tagName: 'SVG',
            selected: false,
            level: 4,
            isInstance: false,
        },
        {
            id: '1.2.1.1.3',
            name: 'Chat Bubble',
            tagName: 'SVG',
            selected: false,
            level: 4,
            isInstance: false,
        },
        {
            id: '1.2.1.1.4',
            name: 'Person',
            tagName: 'SVG',
            selected: false,
            level: 4,
            isInstance: false,
        },
        {
            id: '1.2.1.2',
            name: 'Settings Icon',
            tagName: 'DIV',
            selected: false,
            level: 3,
            isInstance: false,
        },
        {
            id: '1.2.2',
            name: 'Image Grid',
            tagName: 'DIV',
            selected: false,
            level: 2,
            isInstance: false,
        },
        {
            id: '1.2.2.1',
            name: 'Image Columns',
            tagName: 'DIV',
            selected: false,
            level: 3,
            isInstance: false,
        },
        {
            id: '1.2.2.1.1',
            name: 'Image Card 1',
            tagName: 'COMPONENT',
            selected: true,
            level: 4,
            isInstance: false,
        },
        {
            id: '1.2.2.1.1.1',
            name: 'Image Container',
            tagName: 'DIV',
            selected: false,
            level: 5,
            isInstance: false,
        },
        {
            id: '1.2.2.1.1.1.1',
            name: 'Background Overlay',
            tagName: 'DIV',
            selected: false,
            level: 6,
            isInstance: false,
        },
        {
            id: '1.2.2.1.1.1.2',
            name: 'Image',
            tagName: 'IMG',
            selected: false,
            level: 6,
            isInstance: false,
        },
        {
            id: '1.2.2.1.1.2',
            name: 'Caption',
            tagName: 'P',
            selected: false,
            level: 5,
            isInstance: false,
        },
        {
            id: '1.2.2.1.2',
            name: 'Image Card 2',
            tagName: 'COMPONENT',
            selected: false,
            level: 4,
            isInstance: false,
        },
        {
            id: '1.2.2.1.2.1',
            name: 'Image Container',
            tagName: 'DIV',
            selected: false,
            level: 5,
            isInstance: false,
        },
        {
            id: '1.2.2.1.2.1.1',
            name: 'Background Overlay',
            tagName: 'DIV',
            selected: false,
            level: 6,
            isInstance: false,
        },
        {
            id: '1.2.2.1.2.1.2',
            name: 'Image',
            tagName: 'IMG',
            selected: false,
            level: 6,
            isInstance: false,
        },
        {
            id: '1.2.2.1.2.2',
            name: 'Caption',
            tagName: 'P',
            selected: false,
            level: 5,
            isInstance: false,
        },
        {
            id: '1.2.2.1.3',
            name: 'Image Card 3',
            tagName: 'COMPONENT',
            selected: false,
            level: 4,
            isInstance: false,
        },
        {
            id: '1.2.2.1.3.1',
            name: 'Image Container',
            tagName: 'DIV',
            selected: false,
            level: 5,
            isInstance: false,
        },
        {
            id: '1.2.2.1.3.1.1',
            name: 'Background Overlay',
            tagName: 'DIV',
            selected: false,
            level: 6,
            isInstance: false,
        },
        {
            id: '1.2.2.1.3.1.2',
            name: 'Image',
            tagName: 'IMG',
            selected: false,
            level: 6,
            isInstance: false,
        },
        {
            id: '1.2.2.1.3.2',
            name: 'Caption',
            tagName: 'P',
            selected: false,
            level: 5,
            isInstance: false,
        },
        {
            id: '1.2.2.1.4',
            name: 'Image Card 4',
            tagName: 'COMPONENT',
            selected: false,
            level: 4,
            isInstance: false,
        },
        {
            id: '1.2.2.1.4.1',
            name: 'Image Container',
            tagName: 'DIV',
            selected: false,
            level: 5,
            isInstance: false,
        },
        {
            id: '1.2.2.1.4.1.1',
            name: 'Background Overlay',
            tagName: 'DIV',
            selected: false,
            level: 6,
            isInstance: false,
        },
        {
            id: '1.2.2.1.4.1.2',
            name: 'Image',
            tagName: 'IMG',
            selected: false,
            level: 6,
            isInstance: false,
        },
        {
            id: '1.2.2.1.4.2',
            name: 'Caption',
            tagName: 'P',
            selected: false,
            level: 5,
            isInstance: false,
        },
        {
            id: '1.2.2.1.5',
            name: 'Image Card 5',
            tagName: 'DIV',
            selected: false,
            level: 4,
            isInstance: false,
        },
        {
            id: '1.2.2.1.5.1',
            name: 'Image Container',
            tagName: 'DIV',
            selected: false,
            level: 5,
            isInstance: false,
        },
        {
            id: '1.2.2.1.5.1.1',
            name: 'Background Overlay',
            tagName: 'DIV',
            selected: false,
            level: 6,
            isInstance: false,
        },
        {
            id: '1.2.2.1.5.1.2',
            name: 'Image',
            tagName: 'IMG',
            selected: false,
            level: 6,
            isInstance: false,
        },
        {
            id: '1.2.2.1.5.2',
            name: 'Caption',
            tagName: 'P',
            selected: false,
            level: 5,
            isInstance: false,
        },
        {
            id: '1.2.2.1.6',
            name: 'Image Card 6',
            tagName: 'DIV',
            selected: false,
            level: 4,
            isInstance: false,
        },
        {
            id: '1.2.2.1.6.1',
            name: 'Image Container',
            tagName: 'DIV',
            selected: false,
            level: 5,
            isInstance: false,
        },
        {
            id: '1.2.2.1.6.1.1',
            name: 'Background Overlay',
            tagName: 'DIV',
            selected: false,
            level: 6,
            isInstance: false,
        },
        {
            id: '1.2.2.1.6.1.2',
            name: 'Image',
            tagName: 'IMG',
            selected: false,
            level: 6,
            isInstance: false,
        },
        {
            id: '1.2.2.1.6.2',
            name: 'Caption',
            tagName: 'P',
            selected: false,
            level: 5,
            isInstance: false,
        },
    ];
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const [selectedId, setSelectedId] = useState<string>('1.2.2.1.1');
    const [layersPanelOpen, setLayersPanelOpen] = useState(true);

    // Canvas panning state
    const [isPanning, setIsPanning] = useState(false);
    const [panOffset, setPanOffset] = useState({ x: 60, y: -30 }); // Center on first mockup (accounting for layers panel)
    const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

    // Handle mouse down on canvas
    const handleMouseDown = (e: React.MouseEvent) => {
        setIsPanning(true);
        setLastMousePos({ x: e.clientX, y: e.clientY });
    };

    // Handle mouse move for panning
    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isPanning) return;

        const deltaX = e.clientX - lastMousePos.x;
        const deltaY = e.clientY - lastMousePos.y;

        // Constrain panning to larger bounds for infinite canvas feel (±600px from center)
        const newX = Math.max(-600, Math.min(600, panOffset.x + deltaX));
        const newY = Math.max(-400, Math.min(400, panOffset.y + deltaY));

        setPanOffset({ x: newX, y: newY });
        setLastMousePos({ x: e.clientX, y: e.clientY });
    };

    // Handle mouse up
    const handleMouseUp = () => {
        setIsPanning(false);
    };

    // Handle mouse leave
    const handleMouseLeave = () => {
        setIsPanning(false);
    };

    return (
        <div
            className={cn(
                'bg-background-onlook relative mx-auto -mt-10 aspect-[16/10] w-full max-w-6xl overflow-hidden rounded-xl border border-neutral-800 shadow-2xl transition-all duration-1000 ease-out select-none',
                isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0',
            )}
        >
            <div
                className="pointer-events-none absolute inset-0 right-36 z-0 mt-30 flex items-start justify-center gap-12 select-none"
                style={{
                    transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
                    transition: isPanning ? 'none' : 'transform 0.1s ease-out',
                }}
            >
                <NotesComponent />
                <div className="relative flex flex-col items-center rounded-sm border-1 border-teal-300 shadow-xl shadow-black/50">
                    <div className="absolute -top-7 left-1/2 z-50 flex h-6 w-full -translate-x-1/2 flex-row items-center gap-2.5 rounded-lg px-1 text-xs backdrop-blur-lg">
                        <div className="flex flex-1 flex-row items-center gap-1.5 overflow-hidden text-[12px] text-ellipsis whitespace-nowrap text-teal-300">
                            Home
                            <Icons.ChevronDown className="mb-0.5 h-4 w-4 text-teal-400" />
                        </div>
                        <button
                            className="flex h-3 w-3 cursor-pointer items-center justify-center"
                            tabIndex={-1}
                            style={{ pointerEvents: 'none' }}
                        >
                            <Icons.DotsHorizontal className="h-3.5 w-3.5 text-teal-300" />
                        </button>
                    </div>
                    <DesignMockup />
                </div>
                <div className="border-foreground-border relative ml-8 flex flex-col items-center rounded-sm border-[0.5px] shadow-xl shadow-black/50">
                    <div className="absolute -top-7 left-1/2 z-50 flex h-6 w-full -translate-x-1/2 flex-row items-center gap-2.5 rounded-lg px-1 text-xs backdrop-blur-lg">
                        <div className="text-foreground-secondary flex flex-1 flex-row items-center gap-1.5 overflow-hidden text-[12px] text-ellipsis whitespace-nowrap">
                            Home
                            <Icons.ChevronDown className="text-foreground-secondary mb-0.5 h-4 w-4" />
                        </div>
                        <button
                            className="flex h-3 w-3 cursor-pointer items-center justify-center"
                            tabIndex={-1}
                            style={{ pointerEvents: 'none' }}
                        >
                            <Icons.DotsHorizontal className="text-foreground-secondary h-3.5 w-3.5" />
                        </button>
                    </div>
                    <DesignMockupMobile />
                </div>
            </div>
            {/* Top Bar */}
            <div className="relative z-10 grid h-10 grid-cols-3 items-center px-2.5">
                {/* Left: Logo + Project Name + Chevron */}
                <div className="flex min-w-0 items-center gap-1">
                    <Icons.OnlookLogo className="h-5 w-5 shrink-0" />
                    <span className="text-foreground-secondary ml-1 max-w-[100px] truncate text-xs">
                        Villainterest
                    </span>
                    <Icons.ChevronDown className="ml-0.5 h-4 w-4 text-neutral-400" />
                </div>
                {/* Center: Design/Preview toggle */}
                <div className="flex justify-center">
                    <div className="relative">
                        <div className="mt-1 flex h-6 items-center gap-0 font-normal">
                            <button className="text-foreground-primary cursor-pointer bg-transparent px-4 py-1 text-[12px] whitespace-nowrap transition-all duration-150 ease-in-out">
                                Design
                            </button>
                            <button className="text-foreground-secondary cursor-pointer bg-transparent px-4 py-1 text-[12px] whitespace-nowrap transition-all duration-150 ease-in-out hover:text-neutral-300">
                                Preview
                            </button>
                        </div>
                        <div className="absolute -top-1 h-0.5 w-1/2 bg-white" />
                    </div>
                </div>
                {/* Right: Undo/Redo, Live, Avatar */}
                <div className="flex items-center justify-end gap-1.5">
                    <button className="rounded p-1 hover:bg-neutral-800">
                        <Icons.Reset className="text-foreground-secondary h-4 w-4" />
                    </button>
                    <button className="rounded p-1 hover:bg-neutral-800">
                        <Icons.Reset className="text-foreground-secondary h-4 w-4 scale-x-[-1]" />
                    </button>
                    <button className="ml-2 flex flex-row items-center gap-1.5 rounded border-[1px] border-teal-200 bg-teal-900 px-2.5 py-1 text-xs text-teal-200">
                        <Icons.Globe className="h-3.5 w-3.5" />
                        Live
                    </button>
                    <div className="mt-0.5 ml-1 flex h-7.5 w-7.5 items-center justify-center rounded-full bg-neutral-700 text-xs text-white">
                        <img
                            src="/assets/profile-picture.png"
                            alt="Profile Picture"
                            className="h-full w-full rounded-full object-cover"
                        />
                    </div>
                </div>
            </div>
            {/* Main Content */}
            <div className="relative flex h-[calc(100%-2.5rem)]">
                {/* Sidebar */}
                <div className="bg-background-onlook/80 mr-[-4] flex h-full w-14 flex-col items-center justify-between px-2 backdrop-blur-xl">
                    <div className="flex flex-col items-center gap-5 py-4">
                        {/* Active: Layers */}
                        <div
                            className="bg-background-tertiary/50 border-foreground-primary/20 hover:bg-background-tertiary/70 flex cursor-pointer flex-col items-center gap-0.5 rounded-md border-[0.5px] px-2 py-1.5 ring-1 ring-white/5 transition-colors"
                            onClick={() => setLayersPanelOpen(!layersPanelOpen)}
                        >
                            <Icons.Layers className="text-foreground-primary h-4.5 w-4.5" />
                            <p className="text-foreground-primary text-[10px]">Layers</p>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                            <Icons.Brand className="text-foreground-secondary h-4.5 w-4.5" />
                            <p className="text-foreground-secondary text-[10px]">Brand</p>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                            <Icons.File className="text-foreground-secondary h-4.5 w-4.5" />
                            <p className="text-foreground-secondary text-[10px]">Pages</p>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                            <Icons.Image className="text-foreground-secondary h-4.5 w-4.5" />
                            <p className="text-foreground-secondary text-[10px]">Assets</p>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                            <Icons.Component className="text-foreground-secondary h-4.5 w-4.5" />
                            <p className="text-foreground-secondary text-[10px]">Elements</p>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                            <Icons.ViewGrid className="text-foreground-secondary h-4.5 w-4.5" />
                            <p className="text-foreground-secondary text-[10px]">Apps</p>
                        </div>
                    </div>
                    <div className="mb-6 flex w-full flex-row items-center justify-center">
                        <Icons.QuestionMarkCircled className="text-foreground-secondary h-4.5 w-4.5" />
                    </div>
                </div>
                {/* Floating bottom toolbar (absolute, does not affect layout) */}
                <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2">
                    <div className="border-border pointer-events-auto flex flex-col overflow-hidden rounded-lg border-[0.5px] bg-black/60 p-1 px-1 drop-shadow-xl backdrop-blur backdrop-blur-2xl">
                        <div className="flex flex-row gap-0.5">
                            {/* Selected icon */}
                            <div className="bg-background-tertiary/50 text-foreground-primary flex h-8 w-8 items-center justify-center rounded-md border border-transparent">
                                <Icons.CursorArrow className="text-foreground-primary h-4 w-4" />
                            </div>
                            {/* Unselected icons */}
                            <div className="text-foreground-tertiary hover:text-foreground-hover hover:bg-background-tertiary/50 flex h-8 w-8 items-center justify-center rounded-md border border-transparent">
                                <Icons.Hand className="text-foreground-tertiary h-4 w-4" />
                            </div>
                            <div className="text-foreground-tertiary hover:text-foreground-hover hover:bg-background-tertiary/50 flex h-8 w-8 items-center justify-center rounded-md border border-transparent">
                                <Icons.Square className="text-foreground-tertiary h-4 w-4" />
                            </div>
                            <div className="text-foreground-tertiary hover:text-foreground-hover hover:bg-background-tertiary/50 flex h-8 w-8 items-center justify-center rounded-md border border-transparent">
                                <Icons.Text className="text-foreground-tertiary h-4 w-4" />
                            </div>
                            <div className="text-foreground-tertiary hover:text-foreground-hover hover:bg-background-tertiary/50 flex h-8 w-8 items-center justify-center rounded-md border border-transparent">
                                <Icons.Terminal className="text-foreground-tertiary h-4 w-4" />
                            </div>
                        </div>
                    </div>
                </div>
                {/* Layers Side Panel (mini mockup) */}
                {layersPanelOpen && (
                    <div className="h-full w-52 px-1 pt-1">
                        <div className="border-foreground-primary/20 flex h-[98%] w-full flex-col items-center justify-start overflow-hidden rounded-xl border-[0.5px] bg-black/60 backdrop-blur-2xl">
                            <div className="w-full overflow-hidden p-2">
                                <div className="flex w-full flex-col gap-0.5">
                                    {mockLayers.map((layer) => {
                                        const isComponent = layer.tagName === 'COMPONENT';
                                        const isSelected = selectedId === layer.id;
                                        const isHovered = hoveredId === layer.id;

                                        return (
                                            <div
                                                key={layer.id}
                                                className={cn(
                                                    'flex h-5.25 cursor-pointer items-center px-1.5 text-xs transition-colors select-none',
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
                                                <NodeIcon
                                                    iconClass="w-3.5 h-3.5 mr-1.5"
                                                    tagName={layer.tagName}
                                                />
                                                <span className="truncate">{layer.name}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {/* Canvas Area - Panning enabled */}
                <div
                    className="relative flex flex-1 cursor-grab flex-col items-center justify-start active:cursor-grabbing"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseLeave}
                />
                <div className="border-foreground-border relative flex w-64 flex-col justify-end rounded-tl-xl border-t border-l bg-black/70 p-0 backdrop-blur-2xl">
                    <div className="absolute inset-0 flex flex-col">
                        <div className="border-foreground-border z-20 flex h-9 items-center justify-between border-b px-0.5">
                            {/* Tabs */}
                            <div className="flex items-center">
                                <button className="text-foreground-primary flex flex-row items-center gap-1 rounded px-2 py-1 text-xs font-semibold">
                                    <Icons.Sparkles className="h-4 w-4" />
                                    Chat
                                </button>
                                <button className="text-foreground-secondary hover:text-foreground-primary flex flex-row items-center gap-1 rounded px-2 py-1 text-xs">
                                    <Icons.Code className="h-4 w-4" />
                                    Code
                                </button>
                            </div>
                            <div className="border-foreground-border z-20 flex h-9 items-center justify-between border-b px-0.5">
                                <button className="text-foreground-secondary hover:text-foreground-primary flex flex-row items-center gap-1 rounded px-2 py-1 text-xs">
                                    <Icons.Plus className="text-foreground-secondary h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>
                        <div className="flex flex-1 flex-col justify-end">
                            <div className="space-y-2 py-2 pt-24">
                                {chatMessages.map((msg, idx) => {
                                    if (msg.type === 'text' && msg.sender === 'user') {
                                        return <UserMessage key={idx} text={msg.text ?? ''} />;
                                    }
                                    if (msg.type === 'text' && msg.sender === 'ai') {
                                        return <AiMessage key={idx} text={msg.text ?? ''} />;
                                    }
                                    if (msg.type === 'tool') {
                                        return (
                                            <ToolCallDisplay
                                                key={idx}
                                                toolName={msg.toolName ?? ''}
                                            />
                                        );
                                    }
                                    return null;
                                })}
                            </div>
                            <div className="border-foreground-primary/10 flex flex-col items-start gap-1 border-t px-2.5 py-2">
                                <textarea
                                    value={displayedText}
                                    readOnly
                                    className="text-foreground-primary placeholder-foreground-tertiary mb-5 h-20 w-full flex-1 resize-none rounded-lg bg-transparent px-0.5 pt-2 text-xs outline-none"
                                    placeholder="Type a message..."
                                    rows={3}
                                    maxLength={PRESET_SENTENCE.length}
                                    disabled
                                />
                                <div className="flex w-full flex-row items-center justify-between gap-2">
                                    <button
                                        className="flex flex-row items-center gap-2 rounded-lg px-1 py-2"
                                        disabled
                                    >
                                        <Icons.Build className="text-foreground-tertiary/50 h-4 w-4" />
                                        <p className="text-foreground-secondary/50 text-xs">
                                            Build
                                        </p>
                                    </button>
                                    <div className="flex flex-row gap-1">
                                        <button
                                            className="bg-background-secondary/0 hover:bg-background-secondary group cursor-copy rounded-lg px-2 py-2"
                                            disabled
                                        >
                                            <Icons.Image className="text-foreground-tertiary/50 group-hover:text-foreground-primary h-4 w-4" />
                                        </button>
                                        <button
                                            className={`cursor-pointer rounded-full px-2 py-2 ${currentIndex === PRESET_SENTENCE.length ? 'bg-foreground-primary' : 'bg-foreground-onlook'}`}
                                            disabled
                                        >
                                            <Icons.ArrowRight className="text-background-secondary h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
