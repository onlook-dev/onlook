import React, { useState, useEffect } from 'react';
import { Icons } from '@onlook/ui/icons';

export function DirectEditingBlock() {
    const [selectedElement, setSelectedElement] = useState<string | null>('text2');
    const [draggedElement, setDraggedElement] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    const handleResize = (e: React.MouseEvent, position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right') => {
        e.stopPropagation();
        const element = e.currentTarget as HTMLDivElement;
        const parent = element.parentElement as HTMLDivElement;
        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = parent.offsetWidth;
        const startHeight = parent.offsetHeight;
        const startLeft = parent.offsetLeft;
        const startTop = parent.offsetTop;

        const handleMouseMove = (e: MouseEvent) => {
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            let newWidth = startWidth;
            let newHeight = startHeight;
            let newLeft = startLeft;
            let newTop = startTop;

            switch (position) {
                case 'bottom-right':
                    newWidth = Math.max(100, startWidth + deltaX);
                    newHeight = Math.max(30, startHeight + deltaY);
                    break;
                case 'bottom-left':
                    newWidth = Math.max(100, startWidth - deltaX);
                    newHeight = Math.max(30, startHeight + deltaY);
                    newLeft = startLeft + (startWidth - newWidth);
                    break;
                case 'top-right':
                    newWidth = Math.max(100, startWidth + deltaX);
                    newHeight = Math.max(30, startHeight - deltaY);
                    newTop = startTop + (startHeight - newHeight);
                    break;
                case 'top-left':
                    newWidth = Math.max(100, startWidth - deltaX);
                    newHeight = Math.max(30, startHeight - deltaY);
                    newLeft = startLeft + (startWidth - newWidth);
                    newTop = startTop + (startHeight - newHeight);
                    break;
            }

            parent.style.width = `${newWidth}px`;
            parent.style.height = `${newHeight}px`;
            parent.style.left = `${newLeft}px`;
            parent.style.top = `${newTop}px`;
            parent.style.transform = 'none';
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const handleMouseDown = (e: React.MouseEvent, elementId: string) => {
        if ((e.target as HTMLElement).classList.contains('resize-handle')) {
            return;
        }
        
        e.preventDefault();
        setDraggedElement(elementId);
        setSelectedElement(elementId);
        
        const element = e.currentTarget as HTMLDivElement;
        const rect = element.getBoundingClientRect();
        const canvasRect = (element.closest('.canvas-container') as HTMLDivElement).getBoundingClientRect();
        
        setDragOffset({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        });
        
        element.style.opacity = '0.8';
        element.style.cursor = 'grabbing';
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!draggedElement) return;
        
        const canvas = document.querySelector('.canvas-container') as HTMLDivElement;
        const canvasRect = canvas.getBoundingClientRect();
        const element = document.querySelector(`[data-element-id="${draggedElement}"]`) as HTMLDivElement;
        
        if (!element) return;
        
        const newX = e.clientX - canvasRect.left - dragOffset.x;
        const newY = e.clientY - canvasRect.top - dragOffset.y;
        
        // Constrain to canvas bounds
        const maxX = canvasRect.width - element.offsetWidth;
        const maxY = canvasRect.height - element.offsetHeight;
        
        const constrainedX = Math.max(0, Math.min(newX, maxX));
        const constrainedY = Math.max(0, Math.min(newY, maxY));
        
        element.style.left = `${constrainedX}px`;
        element.style.top = `${constrainedY}px`;
        element.style.transform = 'none';
    };

    const handleMouseUp = () => {
        if (draggedElement) {
            const element = document.querySelector(`[data-element-id="${draggedElement}"]`) as HTMLDivElement;
            if (element) {
                element.style.opacity = '1';
                element.style.cursor = 'grab';
            }
            setDraggedElement(null);
        }
    };

    const handleClick = (elementId: string) => {
        setSelectedElement(elementId);
    };

    const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (!target.closest('.draggable-text')) {
            setSelectedElement(null);
        }
    };

    useEffect(() => {
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [draggedElement, dragOffset]);

    return (
        <div className="flex flex-col gap-4">
            <div className="w-full h-100 bg-background-onlook/80 rounded-lg mb-6 overflow-hidden">
                <div className="w-90 h-100 bg-gray-800 rounded relative left-1/2 top-56 transform -translate-x-1/2 -translate-y-1/2 canvas-container">
                    <div 
                        className="absolute cursor-grab select-none text-blue text-xl font-light draggable-text"
                        data-element-id="text1"
                        style={{ 
                            top: '30%', 
                            left: '50%', 
                            transform: 'translate(-50%, -50%)',
                            zIndex: 1,
                            minWidth: '100px',
                            minHeight: '30px',
                            padding: '8px',
                            border: '1px solid transparent',
                            outline: selectedElement === 'text1' ? '2px solid #3b82f6' : 'none',
                            outlineOffset: '-1px',
                            borderRadius: '1px'
                        }}
                        onClick={() => handleClick('text1')}
                        onMouseDown={(e) => handleMouseDown(e, 'text1')}
                        onMouseEnter={(e) => {
                            if (selectedElement === 'text1') {
                                e.currentTarget.style.border = '1px solid #ccc';
                            }
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.border = '1px solid transparent';
                        }}
                    >
                        Drag me anywhere
                        {selectedElement === 'text1' && (
                            <>
                                <div 
                                    className="absolute w-2 h-2 bg-white rounded-full cursor-nwse-resize resize-handle"
                                    style={{ 
                                        right: '-4px', 
                                        bottom: '-4px',
                                        border: '1px solid #3b82f6',
                                        boxShadow: '0 0 0 1px white'
                                    }}
                                    onMouseDown={(e) => handleResize(e, 'bottom-right')}
                                />
                                <div 
                                    className="absolute w-2 h-2 bg-white rounded-full cursor-nesw-resize resize-handle"
                                    style={{ 
                                        left: '-4px', 
                                        bottom: '-4px',
                                        border: '1px solid #3b82f6',
                                        boxShadow: '0 0 0 1px white'
                                    }}
                                    onMouseDown={(e) => handleResize(e, 'bottom-left')}
                                />
                                <div 
                                    className="absolute w-2 h-2 bg-white rounded-full cursor-nesw-resize resize-handle"
                                    style={{ 
                                        right: '-4px', 
                                        top: '-4px',
                                        border: '1px solid #3b82f6',
                                        boxShadow: '0 0 0 1px white'
                                    }}
                                    onMouseDown={(e) => handleResize(e, 'top-right')}
                                />
                                <div 
                                    className="absolute w-2 h-2 bg-white rounded-full cursor-nwse-resize resize-handle"
                                    style={{ 
                                        left: '-4px', 
                                        top: '-4px',
                                        border: '1px solid #3b82f6',
                                        boxShadow: '0 0 0 1px white'
                                    }}
                                    onMouseDown={(e) => handleResize(e, 'top-left')}
                                />
                            </>
                        )}
                    </div>
                    <div 
                        className="absolute cursor-grab select-none text-red-500 text-xl font-light draggable-text"
                        data-element-id="text2"
                        style={{ 
                            top: '70%', 
                            left: '50%', 
                            transform: 'translate(-50%, -50%)',
                            zIndex: 2,
                            minWidth: '100px',
                            minHeight: '30px',
                            padding: '8px',
                            border: '1px solid transparent',
                            outline: selectedElement === 'text2' ? '2px solid #ef4444' : 'none',
                            outlineOffset: '-1px',
                            borderRadius: '1px'
                        }}
                        onClick={() => handleClick('text2')}
                        onMouseDown={(e) => handleMouseDown(e, 'text2')}
                        onMouseEnter={(e) => {
                            if (selectedElement === 'text2') {
                                e.currentTarget.style.border = '1px solid #ccc';
                            }
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.border = '1px solid transparent';
                        }}
                    >
                        I can go on top
                        {selectedElement === 'text2' && (
                            <>
                                <div 
                                    className="absolute w-2 h-2 bg-white rounded-full cursor-nwse-resize resize-handle"
                                    style={{ 
                                        right: '-4px', 
                                        bottom: '-4px',
                                        border: '1px solid #ef4444',
                                        boxShadow: '0 0 0 1px white'
                                    }}
                                    onMouseDown={(e) => handleResize(e, 'bottom-right')}
                                />
                                <div 
                                    className="absolute w-2 h-2 bg-white rounded-full cursor-nesw-resize resize-handle"
                                    style={{ 
                                        left: '-4px', 
                                        bottom: '-4px',
                                        border: '1px solid #ef4444',
                                        boxShadow: '0 0 0 1px white'
                                    }}
                                    onMouseDown={(e) => handleResize(e, 'bottom-left')}
                                />
                                <div 
                                    className="absolute w-2 h-2 bg-white rounded-full cursor-nesw-resize resize-handle"
                                    style={{ 
                                        right: '-4px', 
                                        top: '-4px',
                                        border: '1px solid #ef4444',
                                        boxShadow: '0 0 0 1px white'
                                    }}
                                    onMouseDown={(e) => handleResize(e, 'top-right')}
                                />
                                <div 
                                    className="absolute w-2 h-2 bg-white rounded-full cursor-nwse-resize resize-handle"
                                    style={{ 
                                        left: '-4px', 
                                        top: '-4px',
                                        border: '1px solid #ef4444',
                                        boxShadow: '0 0 0 1px white'
                                    }}
                                    onMouseDown={(e) => handleResize(e, 'top-left')}
                                />
                            </>
                        )}
                    </div>
                </div>
            </div>
            <div className="flex flex-row items-start gap-8 w-full">
                {/* Icon + Title */}
                <div className="flex flex-col items-start w-1/2">
                    <div className="mb-2"><Icons.DirectManipulation className="w-6 h-6 text-foreground-primary" /></div>
                    <span className="text-foreground-primary text-largePlus font-light">Direct editing</span>
                </div>
                {/* Description */}
                <p className="text-foreground-secondary text-regular text-balance w-1/2">Drag-and-drop, rearrange, scale, and more with elements directly in the editor.</p>
            </div>
        </div>
    );
} 