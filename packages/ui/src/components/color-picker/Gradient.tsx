import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Color } from '@onlook/utility';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../select';

const FlipIcon = ({ className, ...props }: { className?: string; [key: string]: any }) => (
    <svg
        width="16"
        height="16"
        viewBox="0 0 15 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        {...props}
    >
        <path
            d="M4.53409 13.4688L2.47603 11.4107C2.23195 11.1666 2.23195 10.7709 2.47603 10.5268L4.53409 8.46875"
            stroke="currentColor"
            strokeWidth="0.9375"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path
            d="M10.4688 7.53125L12.5268 5.47319C12.7709 5.22911 12.7709 4.83339 12.5268 4.58931L10.4688 2.53125"
            stroke="currentColor"
            strokeWidth="0.9375"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path
            d="M3.125 10.9688H12.6562"
            stroke="currentColor"
            strokeWidth="0.9375"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path
            d="M2.34375 5.03125H12.0312"
            stroke="currentColor"
            strokeWidth="0.9375"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

const RotateIcon = ({ className, ...props }: { className?: string; [key: string]: any }) => (
    <svg
        width="16"
        height="16"
        viewBox="0 0 15 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        {...props}
    >
        <path
            d="M12.197 9.65567C12.3003 7.94296 12.0004 6.57856 10.7554 5.33352C8.74176 3.31988 5.477 3.31988 3.46336 5.33352C2.48972 6.30716 1.98685 7.57332 1.95477 8.84912"
            stroke="currentColor"
            strokeWidth="0.9375"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path
            d="M13.8576 8.65058L12.4213 10.0869C12.2382 10.2699 11.9414 10.2699 11.7584 10.0869L10.3221 8.65058"
            stroke="currentColor"
            strokeWidth="0.9375"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

const SelectedStopIcon = ({ className, ...props }: { className?: string; [key: string]: any }) => (
    <svg
        width="20"
        height="24"
        viewBox="0 0 26 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        {...props}
    >
        <path
            d="M8 0.5H18C22.1421 0.5 25.5 3.85786 25.5 8V19.3242C25.5 22.7348 22.7348 25.5 19.3242 25.5C18.9905 25.5001 18.6689 25.6251 18.4229 25.8506L13 30.8213L7.57715 25.8506C7.33114 25.6251 7.00948 25.5001 6.67578 25.5C3.26519 25.5 0.5 22.7348 0.5 19.3242V8C0.5 3.85786 3.85786 0.5 8 0.5Z"
            fill="white"
            stroke="white"
        />
    </svg>
);

const UnselectedStopIcon = ({
    className,
    ...props
}: {
    className?: string;
    [key: string]: any;
}) => (
    <svg
        width="20"
        height="24"
        viewBox="0 0 26 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        {...props}
    >
        <path
            d="M8 0.5H18C22.1421 0.5 25.5 3.85786 25.5 8V19.3242C25.5 22.7348 22.7348 25.5 19.3242 25.5C18.9905 25.5001 18.6689 25.6251 18.4229 25.8506L13 30.8213L7.57715 25.8506C7.33114 25.6251 7.00948 25.5001 6.67578 25.5C3.26519 25.5 0.5 22.7348 0.5 19.3242V8C0.5 3.85786 3.85786 0.5 8 0.5Z"
            fill="#444444"
            stroke="#666666"
        />
    </svg>
);

export interface GradientStop {
    id: string;
    color: string;
    position: number;
}

export interface GradientState {
    type: 'linear' | 'radial' | 'conic' | 'angular' | 'diamond';
    angle: number;
    stops: GradientStop[];
}

export interface GradientProps {
    gradient: GradientState;
    onGradientChange: (gradient: GradientState) => void;
    onStopColorChange: (stopId: string, color: Color) => void;
    onStopSelect: (stopId: string) => void;
    selectedStopId?: string;
    className?: string;
    showPresets?: boolean;
}

const PRESET_GRADIENTS: GradientState[] = [
    {
        type: 'linear',
        angle: 45,
        stops: [
            { id: '1', color: '#ff6b6b', position: 0 },
            { id: '2', color: '#feca57', position: 100 },
        ],
    },
    {
        type: 'linear',
        angle: 45,
        stops: [
            { id: '1', color: '#48cae4', position: 0 },
            { id: '2', color: '#023e8a', position: 100 },
        ],
    },
    {
        type: 'linear',
        angle: 45,
        stops: [
            { id: '1', color: '#f72585', position: 0 },
            { id: '2', color: '#b5179e', position: 100 },
        ],
    },
    {
        type: 'linear',
        angle: 90,
        stops: [
            { id: '1', color: '#667eea', position: 0 },
            { id: '2', color: '#764ba2', position: 100 },
        ],
    },
    {
        type: 'linear',
        angle: 135,
        stops: [
            { id: '1', color: '#f093fb', position: 0 },
            { id: '2', color: '#f5576c', position: 100 },
        ],
    },
    {
        type: 'linear',
        angle: 180,
        stops: [
            { id: '1', color: '#4facfe', position: 0 },
            { id: '2', color: '#00f2fe', position: 100 },
        ],
    },
    {
        type: 'angular',
        angle: 0,
        stops: [
            { id: '1', color: '#ff9a9e', position: 0 },
            { id: '2', color: '#fecfef', position: 50 },
            { id: '3', color: '#fecfef', position: 100 },
        ],
    },
    {
        type: 'diamond',
        angle: 0,
        stops: [
            { id: '1', color: '#a8edea', position: 0 },
            { id: '2', color: '#fed6e3', position: 100 },
        ],
    },
];

const generateId = () => Math.random().toString(36).substr(2, 9);

const generateGradientCSS = (gradient: GradientState): string => {
    const sortedStops = [...gradient.stops].sort((a, b) => a.position - b.position);
    const stopStrings = sortedStops.map((stop) => `${stop.color} ${stop.position}%`);

    switch (gradient.type) {
        case 'linear':
            return `linear-gradient(${gradient.angle}deg, ${stopStrings.join(', ')})`;
        case 'radial':
            return `radial-gradient(circle, ${stopStrings.join(', ')})`;
        case 'conic':
            return `conic-gradient(from ${gradient.angle}deg, ${stopStrings.join(', ')})`;
        case 'angular':
            const angularStops = [...sortedStops];
            if (angularStops.length > 0) {
                const firstStop = angularStops[0];
                if (firstStop) {
                    angularStops.push({
                        id: generateId(),
                        color: firstStop.color,
                        position: 100,
                    });
                }
            }
            const angularStopStrings = angularStops.map(
                (stop) => `${stop.color} ${stop.position}%`,
            );
            return `conic-gradient(from ${gradient.angle}deg, ${angularStopStrings.join(', ')})`;
        case 'diamond':
            if (sortedStops.length < 2) {
                const singleColor = sortedStops[0]?.color || '#000000';
                return `radial-gradient(circle, ${singleColor})`;
            }

            const diamondStopStrings = sortedStops.map((stop) => `${stop.color} ${stop.position}%`);
            return `radial-gradient(ellipse 80% 80% at center, ${diamondStopStrings.join(', ')})`;
        default:
            return `linear-gradient(${gradient.angle}deg, ${stopStrings.join(', ')})`;
    }
};

export const Gradient: React.FC<GradientProps> = ({
    gradient,
    onGradientChange,
    onStopColorChange,
    onStopSelect,
    selectedStopId,
    className = '',
    showPresets = true,
}) => {
    const [dragState, setDragState] = useState<{
        isDragging: boolean;
        stopId: string | null;
        startX: number;
        startPosition: number;
    }>({
        isDragging: false,
        stopId: null,
        startX: 0,
        startPosition: 0,
    });

    const trackRef = useRef<HTMLDivElement>(null);

    const handleStopMouseDown = useCallback(
        (stopId: string, event: React.MouseEvent) => {
            event.preventDefault();
            const stop = gradient.stops.find((s) => s.id === stopId);
            if (!stop) return;

            setDragState({
                isDragging: true,
                stopId,
                startX: event.clientX,
                startPosition: stop.position,
            });

            onStopSelect(stopId);
        },
        [gradient.stops, onStopSelect],
    );

    useEffect(() => {
        const handleMouseMove = (event: MouseEvent) => {
            if (!dragState.isDragging || !dragState.stopId || !trackRef.current) return;

            event.preventDefault();

            const rect = trackRef.current.getBoundingClientRect();
            const relativeX = event.clientX - rect.left;
            const newPosition = Math.max(0, Math.min(100, (relativeX / rect.width) * 100));

            const updatedStops = gradient.stops.map((stop) =>
                stop.id === dragState.stopId ? { ...stop, position: newPosition } : stop,
            );

            onGradientChange({
                ...gradient,
                stops: updatedStops,
            });
        };

        const handleMouseUp = (event: MouseEvent) => {
            event.preventDefault();
            setDragState({
                isDragging: false,
                stopId: null,
                startX: 0,
                startPosition: 0,
            });
        };

        const handleMouseLeave = () => {
            if (dragState.isDragging) {
                setDragState({
                    isDragging: false,
                    stopId: null,
                    startX: 0,
                    startPosition: 0,
                });
            }
        };

        if (dragState.isDragging) {
            document.addEventListener('mousemove', handleMouseMove, { passive: false });
            document.addEventListener('mouseup', handleMouseUp, { passive: false });
            document.addEventListener('mouseleave', handleMouseLeave);
            document.addEventListener('contextmenu', handleMouseUp);
            document.addEventListener('selectstart', (e) => e.preventDefault());
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('mouseleave', handleMouseLeave);
            document.removeEventListener('contextmenu', handleMouseUp);
            document.removeEventListener('selectstart', (e) => e.preventDefault());
        };
    }, [dragState, gradient, onGradientChange]);

    const addStop = useCallback(() => {
        try {
            let newPosition: number;
            let newColor: string;

            if (selectedStopId) {
                const selectedStop = gradient.stops.find((s) => s.id === selectedStopId);
                if (selectedStop) {
                    if (selectedStop.position <= 90) {
                        newPosition = Math.min(100, selectedStop.position + 10);
                    } else {
                        newPosition = Math.max(0, selectedStop.position - 10);
                    }
                    newColor = selectedStop.color;
                } else {
                    newPosition = 50;
                    newColor = '#000000';
                }
            } else {
                newPosition = 50;
                newColor = gradient.stops[0]?.color || '#000000';
            }

            const newStop: GradientStop = {
                id: generateId(),
                color: newColor,
                position: newPosition,
            };

            const updatedStops = [...gradient.stops, newStop];
            onGradientChange({
                ...gradient,
                stops: updatedStops,
            });
            onStopSelect(newStop.id);
        } catch (error) {
            console.error('Failed to add gradient stop:', error);
        }
    }, [gradient, selectedStopId, onGradientChange, onStopSelect]);

    const deleteStop = useCallback(
        (stopId: string) => {
            try {
                if (gradient.stops.length <= 1) {
                    return;
                }

                const updatedStops = gradient.stops.filter((s) => s.id !== stopId);
                onGradientChange({
                    ...gradient,
                    stops: updatedStops,
                });

                if (selectedStopId === stopId && updatedStops.length > 0) {
                    const firstStop = updatedStops[0];
                    if (firstStop) {
                        onStopSelect(firstStop.id);
                    }
                }
            } catch (error) {
                console.error('Failed to delete gradient stop:', error);
            }
        },
        [gradient, selectedStopId, onGradientChange, onStopSelect],
    );

    const flipGradient = useCallback(() => {
        const flippedStops = gradient.stops.map((stop) => ({
            ...stop,
            position: 100 - stop.position,
        }));

        onGradientChange({
            ...gradient,
            stops: flippedStops,
        });
    }, [gradient, onGradientChange]);

    const rotateGradient = useCallback(() => {
        const newAngle = (gradient.angle + 45) % 360;
        onGradientChange({
            ...gradient,
            angle: newAngle,
        });
    }, [gradient, onGradientChange]);

    const handlePresetSelect = useCallback(
        (preset: GradientState) => {
            try {
                const presetWithNewIds = {
                    ...preset,
                    stops: preset.stops.map((stop) => ({
                        ...stop,
                        id: generateId(),
                    })),
                };
                onGradientChange(presetWithNewIds);
                if (presetWithNewIds.stops.length > 0) {
                    onStopSelect(presetWithNewIds.stops[0]!.id);
                }
            } catch (error) {
                console.error('Failed to apply gradient preset:', error);
            }
        },
        [onGradientChange, onStopSelect],
    );

    const handleColorSwatchClick = useCallback(
        (stopId: string) => {
            onStopSelect(stopId);
        },
        [onStopSelect],
    );

    const gradientCSS = generateGradientCSS(gradient);

    return (
        <div className={`flex flex-col gap-3 p-3 ${className}`}>
            {showPresets && (
                <div>
                    <h4 className="text-sm font-medium text-foreground-primary mb-2">Presets</h4>
                    <div className="grid grid-cols-3 gap-2">
                        {PRESET_GRADIENTS.map((preset, index) => (
                            <button
                                key={index}
                                className="h-8 rounded border border-border hover:border-border-secondary transition-colors"
                                style={{
                                    background: generateGradientCSS(preset),
                                }}
                                onClick={() => handlePresetSelect(preset)}
                                title={`Gradient ${index + 1}`}
                            />
                        ))}
                    </div>
                </div>
            )}

            <div className="space-y-2">
                {showPresets && (
                    <h4 className="text-sm font-medium text-foreground-primary mb-3">Custom</h4>
                )}

                <div className="flex items-center justify-between">
                    <Select
                        value={gradient.type}
                        onValueChange={(value) =>
                            onGradientChange({
                                ...gradient,
                                type: value as GradientState['type'],
                            })
                        }
                    >
                        <SelectTrigger className="w-fit bg-background-secondary border-background-secondary py-1.5 px-2 h-fit text-xs rounded focus:outline-none focus:ring-0">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-md bg-background-secondary">
                            <SelectItem
                                value="linear"
                                className="focus:bg-background-tertiary rounded-md text-xs cursor-pointer"
                            >
                                Linear
                            </SelectItem>
                            <SelectItem
                                value="radial"
                                className="focus:bg-background-tertiary rounded-md text-xs cursor-pointer"
                            >
                                Radial
                            </SelectItem>
                            <SelectItem
                                value="conic"
                                className="focus:bg-background-tertiary rounded-md text-xs cursor-pointer"
                            >
                                Conic
                            </SelectItem>
                            <SelectItem
                                value="angular"
                                className="focus:bg-background-tertiary rounded-md text-xs cursor-pointer"
                            >
                                Angular
                            </SelectItem>
                            <SelectItem
                                value="diamond"
                                className="focus:bg-background-tertiary rounded-md text-xs cursor-pointer"
                            >
                                Diamond
                            </SelectItem>
                        </SelectContent>
                    </Select>

                    <div className="flex items-center gap-0 ml-auto">
                        <button
                            onClick={flipGradient}
                            className="p-1.5 text-foreground-secondary hover:text-foreground-primary transition-colors"
                            title="Flip gradient"
                        >
                            <FlipIcon className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={rotateGradient}
                            className="p-1.5 text-foreground-secondary hover:text-foreground-primary transition-colors"
                            title="Rotate gradient"
                        >
                            <RotateIcon className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                <div className="relative">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-foreground-secondary">Stops</span>
                        <button
                            onClick={addStop}
                            className="px-2 py-1 text-xs text-foreground-secondary hover:text-foreground-primary transition-colors w-8 h-6 flex items-center justify-center"
                            title="Add stop"
                        >
                            +
                        </button>
                    </div>
                    <div
                        ref={trackRef}
                        className="h-6 w-full rounded border border-border relative overflow-visible"
                        style={{
                            background: gradientCSS,
                        }}
                    >
                        {gradient.stops.map((stop) => {
                            const isSelected = selectedStopId === stop.id;
                            const isActive = dragState.stopId === stop.id;

                            return (
                                <div
                                    key={stop.id}
                                    className={`absolute top-0 w-5 h-6 transform -translate-x-1/2 -translate-y-1 ${
                                        isActive ? 'cursor-grabbing' : 'cursor-grab'
                                    }`}
                                    style={{
                                        left: `${stop.position}%`,
                                        userSelect: 'none',
                                    }}
                                    onMouseDown={(e) => handleStopMouseDown(stop.id, e)}
                                    onClick={() => handleColorSwatchClick(stop.id)}
                                    title={`${stop.color} at ${stop.position.toFixed(1)}%`}
                                >
                                    <div className="relative w-full h-full">
                                        {isSelected || isActive ? (
                                            <SelectedStopIcon className="w-5 h-6" />
                                        ) : (
                                            <UnselectedStopIcon className="w-5 h-6" />
                                        )}
                                        <div
                                            className="absolute top-1.5 left-1/2 transform -translate-x-1/2 w-2.5 h-2.5 rounded border border-white"
                                            style={{ backgroundColor: stop.color }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="space-y-1.5">
                    {gradient.stops
                        .sort((a, b) => a.position - b.position)
                        .map((stop) => {
                            const isSelected = selectedStopId === stop.id;
                            const canDelete = gradient.stops.length > 1;
                            return (
                                <div key={stop.id} className="flex items-center gap-2">
                                    <div className="flex bg-background-secondary border border-border rounded px-1 py-1 items-center gap-2 flex-1">
                                        <span className="text-xs text-foreground-secondary font-mono w-8 text-center flex-shrink-0">
                                            {stop.position.toFixed(0)}%
                                        </span>

                                        <div className="w-px h-4 bg-foreground-tertiary flex-shrink-0"></div>

                                        <div
                                            className={`w-4 h-4 border cursor-pointer transition-all flex-shrink-0 ${
                                                isSelected
                                                    ? 'border-2 border-white shadow-lg'
                                                    : 'border border-foreground-tertiary hover:border-foreground-secondary'
                                            }`}
                                            style={{ backgroundColor: stop.color }}
                                            onClick={() => handleColorSwatchClick(stop.id)}
                                            title={`Click to select (${stop.color})`}
                                        />

                                        <span className="text-xs text-foreground-primary font-mono flex-1 min-w-0">
                                            {stop.color.toUpperCase()}
                                        </span>

                                        <div className="w-px h-4 bg-foreground-tertiary flex-shrink-0"></div>
                                        <span className="text-xs text-foreground-secondary font-mono w-8 text-center flex-shrink-0">
                                            {stop.position.toFixed(0)}%
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => canDelete && deleteStop(stop.id)}
                                        className={`w-5 h-5 rounded text-xs flex items-center justify-center transition-colors ${
                                            canDelete
                                                ? 'hover:bg-background-secondary text-foreground-secondary hover:text-foreground-primary'
                                                : 'text-foreground-tertiary cursor-not-allowed'
                                        }`}
                                        title={
                                            canDelete ? 'Remove stop' : 'Cannot remove last stop'
                                        }
                                        disabled={!canDelete}
                                    >
                                        −
                                    </button>
                                </div>
                            );
                        })}
                </div>
            </div>
        </div>
    );
};
