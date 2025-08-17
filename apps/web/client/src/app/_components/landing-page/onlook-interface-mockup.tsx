import React from 'react';
import { Icons } from '@onlook/ui/icons';
import { useState } from 'react';
import { cn } from '@onlook/ui/utils';
import { NodeIcon } from '../../project/[id]/_components/left-panel/layers-tab/tree/node-icon';
import { DesignMockup, DesignMockupMobile } from './design-mockup/design-mockup';

// Notes Component for Villainstagram
function NotesComponent() {
  const notes = [
    "Implement evil pin creation (mwahaha)",
    "Add 'light mode' (begrudgingly)",
    "Build villain-to-villain messaging (evil DMs)",
    "Create villain collaboration boards",
    "Add villain lair location sharing (evil meetups)",
    "Create devious recommendation page",
  ];

  return (
    <div className="bg-black/80 backdrop-blur-sm border border-foreground-secondary/20 rounded-lg p-3 w-96 min-w-64 h-fit mt-10">
      <div className="flex items-center gap-2 mb-1">
        <h3 className="text-foreground-secondary text-xs font-mono">Villainterest - Product Notes</h3>
      </div>
      <div className="space-y-2">
        {notes.map((note, index) => (
          <div key={index} className="flex items-start gap-2 text-[10px]">
            <div className="w-1.5 h-1.5 bg-gray-500 rounded-full mt-1.5 flex-shrink-0"></div>
            <span className={`leading-relaxed font-mono ${index < 3 ? 'text-gray-500 line-through' : 'text-gray-300'}`}>{note}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Chat mockup code from AiChatPreviewBlock ---
const chatMessages = [
  { sender: 'user', type: 'text', text: 'The masonry layout is breaking on mobile - can you fix the responsive columns?' },
  { sender: 'ai', type: 'text', text: "I see the issue! The CSS columns aren't adapting properly to smaller screens. Let me update the responsive breakpoints and add proper mobile optimization." },
  { sender: 'ai', type: 'tool', tool: 'Generate code', toolName: 'generateCode', args: { component: 'ImageGrid', fix: 'mobile-responsive' }},
];
const PRESET_SENTENCE = "Add a villain verification badge system";
function UserMessage({ text }: { text: string }) {
  return (
    <div className="relative group w-full flex flex-row justify-end px-2">
      <div className="w-[80%] flex flex-col ml-8 p-2 rounded-lg shadow-sm rounded-br-none border-[0.5px] bg-background-secondary text-foreground-secondary relative">
        <div className="text-xs font-light">{text ?? ''}</div>
      </div>
    </div>
  );
}
function AiMessage({ text }: { text: string }) {
  return (
    <div className="relative group w-full flex flex-row justify-start px-2">
      <div className="w-[90%] flex flex-col mr-8 p-1 rounded-lg shadow-sm rounded-bl-none bg-none text-foreground-primary relative">
        <div className="text-xs leading-4.5 font-light mt-1">{text ?? ''}</div>
      </div>
    </div>
  );
}
function ToolCallDisplay({ toolName }: { toolName: string }) {
  return (
    <div className="px-2">
      <div className="border rounded-lg bg-black/40 backdrop-blur-lg relative">
        <div className="flex items-center justify-between text-foreground-secondary transition-colors pl-3 py-2">
          <div className="flex items-center gap-2">
            <Icons.LoadingSpinner className="h-4 w-4 text-foreground-secondary animate-spin" />
            <span className="text-xs pointer-events-none select-none bg-gradient-to-l from-white/20 via-white/90 to-white/20 bg-[length:200%_100%] bg-clip-text text-transparent animate-shimmer filter drop-shadow-[0_0_14px_rgba(255,255,255,1)]">
              Website.tsx
            </span>
          </div>
          <Icons.ChevronDown className="h-4 w-4 text-foreground-tertiary mr-2" />
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
    { id: '1', name: 'Design Mockup Container', tagName: 'DIV', selected: false, level: 0, isInstance: false },
    { id: '1.1', name: 'Top Navigation Bar', tagName: 'COMPONENT', selected: false, level: 1, isInstance: false },
    { id: '1.1.1', name: 'Logo', tagName: 'DIV', selected: false, level: 2, isInstance: false },
    { id: '1.1.2', name: 'Search Bar', tagName: 'DIV', selected: false, level: 2, isInstance: false },
    { id: '1.1.2.1', name: 'Search Text', tagName: 'SPAN', selected: false, level: 3, isInstance: false },
    { id: '1.1.2.2', name: 'Clear Button', tagName: 'DIV', selected: false, level: 3, isInstance: false },
    { id: '1.1.3', name: 'User Button', tagName: 'DIV', selected: false, level: 2, isInstance: false },
    { id: '1.2', name: 'Main Content', tagName: 'DIV', selected: false, level: 1, isInstance: false },
    { id: '1.2.1', name: 'Left Sidebar', tagName: 'DIV', selected: false, level: 2, isInstance: false },
    { id: '1.2.1.1', name: 'Navigation Icons', tagName: 'DIV', selected: false, level: 3, isInstance: false },
    { id: '1.2.1.1.1', name: 'Magnifying Glass', tagName: 'SVG', selected: false, level: 4, isInstance: false },
    { id: '1.2.1.1.2', name: 'Sparkles', tagName: 'SVG', selected: false, level: 4, isInstance: false },
    { id: '1.2.1.1.3', name: 'Chat Bubble', tagName: 'SVG', selected: false, level: 4, isInstance: false },
    { id: '1.2.1.1.4', name: 'Person', tagName: 'SVG', selected: false, level: 4, isInstance: false },
    { id: '1.2.1.2', name: 'Settings Icon', tagName: 'DIV', selected: false, level: 3, isInstance: false },
    { id: '1.2.2', name: 'Image Grid', tagName: 'DIV', selected: false, level: 2, isInstance: false },
    { id: '1.2.2.1', name: 'Image Columns', tagName: 'DIV', selected: false, level: 3, isInstance: false },
    { id: '1.2.2.1.1', name: 'Image Card 1', tagName: 'COMPONENT', selected: true, level: 4, isInstance: false },
    { id: '1.2.2.1.1.1', name: 'Image Container', tagName: 'DIV', selected: false, level: 5, isInstance: false },
    { id: '1.2.2.1.1.1.1', name: 'Background Overlay', tagName: 'DIV', selected: false, level: 6, isInstance: false },
    { id: '1.2.2.1.1.1.2', name: 'Image', tagName: 'IMG', selected: false, level: 6, isInstance: false },
    { id: '1.2.2.1.1.2', name: 'Caption', tagName: 'P', selected: false, level: 5, isInstance: false },
    { id: '1.2.2.1.2', name: 'Image Card 2', tagName: 'COMPONENT', selected: false, level: 4, isInstance: false },
    { id: '1.2.2.1.2.1', name: 'Image Container', tagName: 'DIV', selected: false, level: 5, isInstance: false },
    { id: '1.2.2.1.2.1.1', name: 'Background Overlay', tagName: 'DIV', selected: false, level: 6, isInstance: false },
    { id: '1.2.2.1.2.1.2', name: 'Image', tagName: 'IMG', selected: false, level: 6, isInstance: false },
    { id: '1.2.2.1.2.2', name: 'Caption', tagName: 'P', selected: false, level: 5, isInstance: false },
    { id: '1.2.2.1.3', name: 'Image Card 3', tagName: 'COMPONENT', selected: false, level: 4, isInstance: false },
    { id: '1.2.2.1.3.1', name: 'Image Container', tagName: 'DIV', selected: false, level: 5, isInstance: false },
    { id: '1.2.2.1.3.1.1', name: 'Background Overlay', tagName: 'DIV', selected: false, level: 6, isInstance: false },
    { id: '1.2.2.1.3.1.2', name: 'Image', tagName: 'IMG', selected: false, level: 6, isInstance: false },
    { id: '1.2.2.1.3.2', name: 'Caption', tagName: 'P', selected: false, level: 5, isInstance: false },
    { id: '1.2.2.1.4', name: 'Image Card 4', tagName: 'COMPONENT', selected: false, level: 4, isInstance: false },
    { id: '1.2.2.1.4.1', name: 'Image Container', tagName: 'DIV', selected: false, level: 5, isInstance: false },
    { id: '1.2.2.1.4.1.1', name: 'Background Overlay', tagName: 'DIV', selected: false, level: 6, isInstance: false },
    { id: '1.2.2.1.4.1.2', name: 'Image', tagName: 'IMG', selected: false, level: 6, isInstance: false },
    { id: '1.2.2.1.4.2', name: 'Caption', tagName: 'P', selected: false, level: 5, isInstance: false },
    { id: '1.2.2.1.5', name: 'Image Card 5', tagName: 'DIV', selected: false, level: 4, isInstance: false },
    { id: '1.2.2.1.5.1', name: 'Image Container', tagName: 'DIV', selected: false, level: 5, isInstance: false },
    { id: '1.2.2.1.5.1.1', name: 'Background Overlay', tagName: 'DIV', selected: false, level: 6, isInstance: false },
    { id: '1.2.2.1.5.1.2', name: 'Image', tagName: 'IMG', selected: false, level: 6, isInstance: false },
    { id: '1.2.2.1.5.2', name: 'Caption', tagName: 'P', selected: false, level: 5, isInstance: false },
    { id: '1.2.2.1.6', name: 'Image Card 6', tagName: 'DIV', selected: false, level: 4, isInstance: false },
    { id: '1.2.2.1.6.1', name: 'Image Container', tagName: 'DIV', selected: false, level: 5, isInstance: false },
    { id: '1.2.2.1.6.1.1', name: 'Background Overlay', tagName: 'DIV', selected: false, level: 6, isInstance: false },
    { id: '1.2.2.1.6.1.2', name: 'Image', tagName: 'IMG', selected: false, level: 6, isInstance: false },
    { id: '1.2.2.1.6.2', name: 'Caption', tagName: 'P', selected: false, level: 5, isInstance: false },
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
      <div className={cn(
        "relative w-full max-w-6xl mx-auto aspect-[16/10] rounded-xl overflow-hidden shadow-2xl border border-neutral-800 bg-background-onlook select-none -mt-10 transition-all duration-1000 ease-out",
        isVisible 
          ? "opacity-100 translate-y-0" 
          : "opacity-0 translate-y-8"
      )}>
        <div 
          className="absolute inset-0 flex items-start mt-30 justify-center pointer-events-none z-0 right-36 select-none gap-12"
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
            transition: isPanning ? 'none' : 'transform 0.1s ease-out'
          }}
        >
          <NotesComponent />
          <div className="relative flex flex-col items-center border-1 border-teal-300 rounded-sm shadow-xl shadow-black/50">
            <div
              className="absolute left-1/2 -translate-x-1/2 -top-7 z-50 w-full flex flex-row items-center rounded-lg h-6 text-xs px-1 gap-2.5 backdrop-blur-lg"
            >
              <div className="flex-1 flex flex-row items-center gap-1.5 overflow-hidden text-ellipsis whitespace-nowrap text-[12px] text-teal-300">
                Home
                <Icons.ChevronDown className="w-4 h-4 text-teal-400 mb-0.5" />
              </div>
              <button className="w-3 h-3 flex items-center justify-center cursor-pointer" tabIndex={-1} style={{ pointerEvents: 'none' }}>
                <Icons.DotsHorizontal className="w-3.5 h-3.5 text-teal-300" />
              </button>
            </div>
            <DesignMockup />
          </div>
          <div className="relative flex flex-col items-center border-[0.5px] border-foreground-border rounded-sm shadow-xl shadow-black/50 ml-8">
            <div
              className="absolute left-1/2 -translate-x-1/2 -top-7 z-50 w-full flex flex-row items-center rounded-lg h-6 text-xs px-1 gap-2.5 backdrop-blur-lg"
            >
              <div className="flex-1 flex flex-row items-center gap-1.5 overflow-hidden text-ellipsis whitespace-nowrap text-[12px] text-foreground-secondary">
                Home
                <Icons.ChevronDown className="w-4 h-4 text-foreground-secondary mb-0.5" />
              </div>
              <button className="w-3 h-3 flex items-center justify-center cursor-pointer" tabIndex={-1} style={{ pointerEvents: 'none' }}>
                <Icons.DotsHorizontal className="w-3.5 h-3.5 text-foreground-secondary" />
              </button>
            </div>
            <DesignMockupMobile />
          </div>
        </div>
      {/* Top Bar */}
      <div className="grid grid-cols-3 items-center h-10 px-2.5 relative z-10">
        {/* Left: Logo + Project Name + Chevron */}
        <div className="flex items-center gap-1 min-w-0">
          <Icons.OnlookLogo className="w-5 h-5 shrink-0" />
          <span className="text-xs text-foreground-secondary ml-1 truncate max-w-[100px]">Villainterest</span>
          <Icons.ChevronDown className="w-4 h-4 text-neutral-400 ml-0.5" />
        </div>
        {/* Center: Design/Preview toggle */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="flex items-center gap-0 font-normal h-6 mt-1">
              <button className="text-[12px] text-foreground-primary px-4 py-1 whitespace-nowrap bg-transparent cursor-pointer transition-all duration-150 ease-in-out">Design</button>
              <button className="text-[12px] text-foreground-secondary px-4 py-1 whitespace-nowrap bg-transparent cursor-pointer transition-all duration-150 ease-in-out hover:text-neutral-300">Preview</button>
            </div>
            <div className="absolute -top-1 h-0.5 bg-white w-1/2" />
          </div>
        </div>
        {/* Right: Undo/Redo, Live, Avatar */}
        <div className="flex items-center gap-1.5 justify-end">
          <button className="p-1 rounded hover:bg-neutral-800">
            <Icons.Reset className="w-4 h-4 text-foreground-secondary" />
          </button>
          <button className="p-1 rounded hover:bg-neutral-800">
            <Icons.Reset className="w-4 h-4 text-foreground-secondary scale-x-[-1]" />
          </button>
          <button className="bg-teal-900 border-[1px] border-teal-200 text-teal-200 text-xs px-2.5 py-1 rounded ml-2 flex flex-row items-center gap-1.5">
            <Icons.Globe className="w-3.5 h-3.5" />
            Live
          </button>
          <div className="w-7.5 h-7.5 rounded-full bg-neutral-700 flex items-center justify-center text-xs text-white ml-1 mt-0.5">
            <img src="/assets/profile-picture.png" alt="Profile Picture" className="w-full h-full object-cover rounded-full" />
          </div>
        </div>
      </div>
      {/* Main Content */}
      <div className="flex h-[calc(100%-2.5rem)] relative">
        {/* Sidebar */}
        <div className="w-14 h-full flex flex-col items-center justify-between bg-background-onlook/80 backdrop-blur-xl mr-[-4] px-2">
          <div className="flex flex-col items-center py-4 gap-5">
            {/* Active: Layers */}
            <div 
              className="flex flex-col items-center gap-0.5 rounded-md px-2 py-1.5 bg-background-tertiary/50 ring-1 ring-white/5 border-[0.5px] border-foreground-primary/20 cursor-pointer hover:bg-background-tertiary/70 transition-colors"
              onClick={() => setLayersPanelOpen(!layersPanelOpen)}
            >
              <Icons.Layers className="w-4.5 h-4.5 text-foreground-primary" />
              <p className="text-[10px] text-foreground-primary">Layers</p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Icons.Brand className="w-4.5 h-4.5 text-foreground-secondary" />
              <p className="text-[10px] text-foreground-secondary">Brand</p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Icons.File className="w-4.5 h-4.5 text-foreground-secondary" />
              <p className="text-[10px] text-foreground-secondary">Pages</p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Icons.Image className="w-4.5 h-4.5 text-foreground-secondary" />
              <p className="text-[10px] text-foreground-secondary">Assets</p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Icons.Component className="w-4.5 h-4.5 text-foreground-secondary" />
              <p className="text-[10px] text-foreground-secondary">Elements</p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Icons.ViewGrid className="w-4.5 h-4.5 text-foreground-secondary" />
              <p className="text-[10px] text-foreground-secondary">Apps</p>
            </div>
          </div>
          <div className="flex flex-row items-center justify-center w-full mb-6">
            <Icons.QuestionMarkCircled className="w-4.5 h-4.5 text-foreground-secondary" />
          </div>
        </div>
        {/* Floating bottom toolbar (absolute, does not affect layout) */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-3 z-10 pointer-events-none">
          <div className="flex flex-col border-[0.5px] border-border p-1 px-1 bg-black/60 backdrop-blur-2xl rounded-lg backdrop-blur drop-shadow-xl overflow-hidden pointer-events-auto">
            <div className="flex flex-row gap-0.5">
              {/* Selected icon */}
              <div className="h-8 w-8 flex items-center justify-center rounded-md border border-transparent bg-background-tertiary/50 text-foreground-primary">
                <Icons.CursorArrow className="w-4 h-4 text-foreground-primary" />
              </div>
              {/* Unselected icons */}
              <div className="h-8 w-8 flex items-center justify-center rounded-md border border-transparent text-foreground-tertiary hover:text-foreground-hover hover:bg-background-tertiary/50">
                <Icons.Hand className="w-4 h-4 text-foreground-tertiary" />
              </div>
              <div className="h-8 w-8 flex items-center justify-center rounded-md border border-transparent text-foreground-tertiary hover:text-foreground-hover hover:bg-background-tertiary/50">
                <Icons.Square className="w-4 h-4 text-foreground-tertiary" />
              </div>
              <div className="h-8 w-8 flex items-center justify-center rounded-md border border-transparent text-foreground-tertiary hover:text-foreground-hover hover:bg-background-tertiary/50">
                <Icons.Text className="w-4 h-4 text-foreground-tertiary" />
              </div>
              <div className="h-8 w-8 flex items-center justify-center rounded-md border border-transparent text-foreground-tertiary hover:text-foreground-hover hover:bg-background-tertiary/50">
                <Icons.Terminal className="w-4 h-4 text-foreground-tertiary" />
              </div>
            </div>
          </div>
        </div>
        {/* Layers Side Panel (mini mockup) */}
        {layersPanelOpen && (
          <div className="w-52 h-full px-1 pt-1">
            <div className="w-full h-[98%] rounded-xl overflow-hidden flex flex-col items-center justify-start bg-black/60 backdrop-blur-2xl border-[0.5px] border-foreground-primary/20">
            <div className="w-full p-2 overflow-hidden">
              <div className="flex flex-col gap-0.5 w-full">
                {mockLayers.map((layer) => {
                  const isComponent = layer.tagName === 'COMPONENT';
                  const isSelected = selectedId === layer.id;
                  const isHovered = hoveredId === layer.id;

                  return (
                    <div
                      key={layer.id}
                      className={cn(
                        'flex items-center h-5.25 px-1.5 cursor-pointer transition-colors select-none text-xs',
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
          </div>
        </div>
        )}
        {/* Canvas Area - Panning enabled */}
        <div 
          className="flex-1 flex flex-col items-center justify-start relative cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        />
        <div className="w-64 bg-black/70 backdrop-blur-2xl border-l border-t rounded-tl-xl border-foreground-border flex flex-col justify-end p-0 relative">
          <div className="absolute inset-0 flex flex-col"> 
          <div className="flex items-center justify-between h-9 px-0.5 border-b border-foreground-border z-20">
            {/* Tabs */}
            <div className="flex items-center">
              <button className="text-xs font-semibold text-foreground-primary px-2 py-1 rounded flex flex-row items-center gap-1">
                <Icons.Sparkles className="w-4 h-4" />
                Chat
            </button>
              <button className="text-xs text-foreground-secondary px-2 py-1 rounded hover:text-foreground-primary flex flex-row items-center gap-1">
                <Icons.Code className="w-4 h-4" />
                Code
              </button>
            </div>
            <div className="flex items-center justify-between h-9 px-0.5 border-b border-foreground-border z-20">
              <button className="text-xs text-foreground-secondary px-2 py-1 rounded hover:text-foreground-primary flex flex-row items-center gap-1">
                <Icons.Plus className="w-3.5 h-3.5 text-foreground-secondary" />
              </button>
            </div>
          </div>
            <div className="flex-1 flex flex-col justify-end">
              <div className="py-2 space-y-2 pt-24">
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
              <div className="border-t border-foreground-primary/10 px-2.5 py-2 flex flex-col items-start gap-1">
                <textarea
                  value={displayedText}
                  readOnly
                  className="flex-1 text-foreground-primary placeholder-foreground-tertiary text-xs px-0.5 pt-2 h-20 mb-5 w-full resize-none rounded-lg outline-none bg-transparent"
                  placeholder="Type a message..."
                  rows={3}
                  maxLength={PRESET_SENTENCE.length}
                  disabled
                />
                <div className="flex flex-row items-center justify-between w-full gap-2">
                  <button className="px-1 py-2 rounded-lg flex flex-row items-center gap-2" disabled>
                    <Icons.Build className="h-4 w-4 text-foreground-tertiary/50" />
                    <p className="text-foreground-secondary/50 text-xs">Build</p>
                  </button>
                  <div className="flex flex-row gap-1">
                    <button className="px-2 py-2 rounded-lg bg-background-secondary/0 hover:bg-background-secondary group cursor-copy" disabled>
                      <Icons.Image className="h-4 w-4 text-foreground-tertiary/50 group-hover:text-foreground-primary" />
                    </button>
                    <button className={`px-2 py-2 rounded-full cursor-pointer ${currentIndex === PRESET_SENTENCE.length ? 'bg-foreground-primary' : 'bg-foreground-onlook'}`} disabled>
                      <Icons.ArrowRight className="h-3.5 w-3.5 text-background-secondary" />
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