import React, { useCallback, useEffect, useRef, useState } from 'react';

import { Color } from '@onlook/utility';

import { Icons } from '../icons';
import { Popover, PopoverContent, PopoverTrigger } from '../popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../select';
import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip';
import { ColorPicker } from './ColorPicker';

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
    opacity?: number; // Optional opacity property (0-100), defaults to 100
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
            { id: '1', color: '#ff6b6b', position: 0, opacity: 100 },
            { id: '2', color: '#feca57', position: 100, opacity: 100 },
        ],
    },
    {
        type: 'linear',
        angle: 45,
        stops: [
            { id: '1', color: '#48cae4', position: 0, opacity: 100 },
            { id: '2', color: '#023e8a', position: 100, opacity: 100 },
        ],
    },
    {
        type: 'linear',
        angle: 45,
        stops: [
            { id: '1', color: '#f72585', position: 0, opacity: 100 },
            { id: '2', color: '#b5179e', position: 100, opacity: 100 },
        ],
    },
    {
        type: 'linear',
        angle: 90,
        stops: [
            { id: '1', color: '#667eea', position: 0, opacity: 100 },
            { id: '2', color: '#764ba2', position: 100, opacity: 100 },
        ],
    },
    {
        type: 'linear',
        angle: 135,
        stops: [
            { id: '1', color: '#f093fb', position: 0, opacity: 100 },
            { id: '2', color: '#f5576c', position: 100, opacity: 100 },
        ],
    },
    {
        type: 'linear',
        angle: 180,
        stops: [
            { id: '1', color: '#4facfe', position: 0, opacity: 100 },
            { id: '2', color: '#00f2fe', position: 100, opacity: 100 },
        ],
    },
    {
        type: 'angular',
        angle: 0,
        stops: [
            { id: '1', color: '#ff9a9e', position: 0, opacity: 100 },
            { id: '2', color: '#fecfef', position: 50, opacity: 100 },
            { id: '3', color: '#fecfef', position: 100, opacity: 100 },
        ],
    },
    {
        type: 'diamond',
        angle: 0,
        stops: [
            { id: '1', color: '#a8edea', position: 0, opacity: 100 },
            { id: '2', color: '#fed6e3', position: 100, opacity: 100 },
        ],
    },
];

const generateId = () => Math.random().toString(36).slice(2, 11);

export const generateGradientCSS = (gradient: GradientState): string => {
    const sortedStops = [...gradient.stops].sort((a, b) => a.position - b.position);

    // Helper function to apply opacity to color
    const applyOpacity = (color: string, opacity: number) => {
        const opacityDecimal = opacity / 100;
        if (color.startsWith('#') && color.length === 7) {
            // Convert hex to hex with alpha
            const alpha = Math.round(opacityDecimal * 255)
                .toString(16)
                .padStart(2, '0');
            return `${color}${alpha}`;
        }
        // For other color formats, return as is (opacity should be handled by the color picker)
        return color;
    };

    const stopStrings = sortedStops.map(
        (stop) => `${applyOpacity(stop.color, stop.opacity ?? 100)} ${stop.position}%`,
    );

    switch (gradient.type) {
        case 'linear':
            return `linear-gradient(${gradient.angle}deg, ${stopStrings.join(', ')})`;
        case 'radial':
            return `radial-gradient(circle, ${stopStrings.join(', ')})`;
        case 'conic':
            return `conic-gradient(from ${gradient.angle}deg, ${stopStrings.join(', ')})`;
        case 'angular': {
            const angularStops = [...sortedStops];
            if (angularStops.length > 0) {
                const firstStop = angularStops[0];
                const lastStop = angularStops[angularStops.length - 1];
                // If the last stop is not at 100%, add a stop at 100% with the same color as the first stop
                if (lastStop && lastStop.position !== 100 && firstStop) {
                    angularStops.push({
                        id: generateId(),
                        color: firstStop.color,
                        position: 100,
                        opacity: firstStop.opacity ?? 100,
                    });
                }
            }
            const angularStopStrings = angularStops.map(
                (stop) => `${applyOpacity(stop.color, stop.opacity ?? 100)} ${stop.position}%`,
            );
            return `conic-gradient(from ${gradient.angle}deg, ${angularStopStrings.join(', ')})`;
        }
        case 'diamond': {
            if (sortedStops.length < 2) {
                const singleColor = sortedStops[0]?.color || '#000000';
                const opacity = sortedStops[0]?.opacity || 100;
                return `radial-gradient(circle, ${applyOpacity(singleColor, opacity)})`;
            }

            const diamondStopStrings = sortedStops.map(
                (stop) => `${applyOpacity(stop.color, stop.opacity ?? 100)} ${stop.position}%`,
            );
            return `radial-gradient(ellipse 80% 80% at center, ${diamondStopStrings.join(', ')})`;
        }
        default:
            return `linear-gradient(${gradient.angle}deg, ${stopStrings.join(', ')})`;
    }
};

export const parseGradientFromCSS = (cssValue: string): GradientState | null => {
    try {
        const normalized = cssValue.trim();

        const extractGradientParams = (css: string, gradientType: string): string | null => {
            const startIndex = css.indexOf(`${gradientType}(`);
            if (startIndex === -1) return null;

            const openParenIndex = startIndex + gradientType.length + 1;
            let parenCount = 0;
            let endIndex = openParenIndex;

            // Find the matching closing parenthesis
            for (let i = openParenIndex; i < css.length; i++) {
                if (css[i] === '(') {
                    parenCount++;
                } else if (css[i] === ')') {
                    if (parenCount === 0) {
                        endIndex = i;
                        break;
                    }
                    parenCount--;
                }
            }

            return css.substring(openParenIndex, endIndex);
        };

        const parseDirectionalAngle = (direction: string): number => {
            const directions: Record<string, number> = {
                'to right': 0,
                'to left': 180,
                'to top': 270,
                'to bottom': 90,
                'to top right': 315,
                'to top left': 225,
                'to bottom right': 45,
                'to bottom left': 135,
            };
            return directions[direction.toLowerCase()] ?? 90;
        };

        const parseColorStops = (stopsString: string): { color: string; position: number }[] => {
            const stops: { color: string; position: number }[] = [];

            const stopMatches = stopsString.split(/,(?![^()]*\))/);

            stopMatches.forEach((stop, index) => {
                const trimmed = stop.trim();
                if (!trimmed) return;

                const colorMatch =
                    /^(#[0-9a-fA-F]{3,8}|rgb\([^)]+\)|rgba\([^)]+\)|hsl\([^)]+\)|hsla\([^)]+\)|[a-zA-Z]+)\s*(\d+(?:\.\d+)?)?%?/.exec(
                        trimmed,
                    );

                if (colorMatch?.[1]) {
                    const color = Color.from(colorMatch[1]).toHex6();
                    const position = colorMatch[2]
                        ? parseFloat(colorMatch[2])
                        : (index / Math.max(1, stopMatches.length - 1)) * 100;
                    stops.push({ color, position });
                }
            });

            return stops;
        };

        let type: GradientState['type'] = 'linear';
        let angle = 90;
        let stopsString = '';

        const linearParams = extractGradientParams(normalized, 'linear-gradient');
        if (linearParams) {
            type = 'linear';

            const directionalMatch =
                /^(to\s+(?:top|bottom|left|right)(?:\s+(?:top|bottom|left|right))?)\s*,?\s*(.*)/i.exec(
                    linearParams,
                );
            if (directionalMatch?.[1] && directionalMatch[2]) {
                const direction = directionalMatch[1];
                angle = parseDirectionalAngle(direction);
                stopsString = directionalMatch[2];
            } else {
                // Check for angle in degrees
                const angleMatch = /^(\d+)deg\s*,?\s*(.*)/.exec(linearParams);
                if (angleMatch?.[1] && angleMatch[2]) {
                    angle = parseInt(angleMatch[1]);
                    stopsString = angleMatch[2];
                } else {
                    // No angle specified, use default
                    stopsString = linearParams;
                }
            }
        } else {
            // Parse radial gradients
            const radialParams = extractGradientParams(normalized, 'radial-gradient');
            if (radialParams) {
                // Check if it's a diamond gradient (ellipse 80% 80% pattern)
                if (radialParams.includes('ellipse 80% 80%')) {
                    type = 'diamond';
                    stopsString = radialParams.replace(
                        /^ellipse\s+80%\s+80%\s+at\s+center,?\s*/,
                        '',
                    );
                } else {
                    type = 'radial';
                    stopsString = radialParams.replace(/^(circle|ellipse).*?,?\s*/, '');
                }
            } else {
                // Parse conic gradients
                const conicParams = extractGradientParams(normalized, 'conic-gradient');
                if (conicParams) {
                    const angleMatch = /^from\s+(\d+)deg\s*,?\s*(.*)/.exec(conicParams);

                    if (angleMatch?.[1] && angleMatch[2]) {
                        angle = parseInt(angleMatch[1]);
                        stopsString = angleMatch[2];
                    } else {
                        stopsString = conicParams;
                    }

                    // Parse stops first to check for angular pattern
                    const tempStops = parseColorStops(stopsString);

                    const firstStop = tempStops[0];
                    const lastStop = tempStops[tempStops.length - 1];
                    const secondLastStop = tempStops[tempStops.length - 2];

                    const isAngular =
                        tempStops.length === 3 &&
                        firstStop &&
                        lastStop &&
                        secondLastStop &&
                        secondLastStop.color === lastStop.color &&
                        Math.abs(lastStop.position - 100) < 1;

                    if (isAngular) {
                        type = 'angular';
                        stopsString = tempStops
                            .map((stop) =>
                                stop.position === Math.round(stop.position)
                                    ? `${stop.color} ${Math.round(stop.position)}%`
                                    : `${stop.color} ${stop.position}%`,
                            )
                            .join(', ');
                    } else {
                        type = 'conic';
                    }
                } else {
                    return null;
                }
            }
        }

        const stops: GradientStop[] = [];
        const parsedStops = parseColorStops(stopsString);

        parsedStops.forEach((stop, index) => {
            stops.push({
                id: `stop-${index + 1}`,
                color: stop.color,
                position: Math.round(stop.position),
                opacity: 100, // Default opacity for parsed gradients
            });
        });

        if (stops.length < 2) return null;

        return { type, angle, stops };
    } catch (error) {
        console.warn('Failed to parse gradient:', error);
        return null;
    }
};

const PercentageInput: React.FC<{
    value: number;
    onChange: (value: number) => void;
    className?: string;
    onFocus?: () => void;
}> = ({ value, onChange, className = '', onFocus }) => {
    const [displayValue, setDisplayValue] = useState(value.toFixed(0));
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!isFocused) {
            setDisplayValue(value.toFixed(0));
        }
    }, [value, isFocused]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            const increment = e.shiftKey ? 10 : 1;
            const currentValue = parseInt(displayValue) || 0;
            let newValue;

            if (e.key === 'ArrowUp') {
                newValue = Math.min(100, currentValue + increment);
            } else {
                newValue = Math.max(0, currentValue - increment);
            }

            setDisplayValue(newValue.toString());
            onChange(newValue);
        } else if (e.key === 'Enter' || e.key === 'Escape') {
            inputRef.current?.blur();
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = e.target.value.replace(/[^0-9]/g, '');
        setDisplayValue(inputValue);
    };

    const handleBlur = () => {
        setIsFocused(false);
        const numValue = parseInt(displayValue) || 0;
        const clampedValue = Math.max(0, Math.min(100, numValue));
        setDisplayValue(clampedValue.toString());
        onChange(clampedValue);
    };

    const handleFocus = () => {
        setIsFocused(true);
        onFocus?.(); // Call the onFocus prop if provided
        // Select all text on focus for easier editing
        setTimeout(() => {
            inputRef.current?.select();
        }, 0);
    };

    return (
        <input
            ref={inputRef}
            value={`${displayValue}%`}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className={`bg-background-secondary text-foreground-secondary focus:bg-background-tertiary focus:text-foreground-primary flex h-6.5 w-10 cursor-text items-center justify-start rounded border-none pl-0.75 text-xs outline-none ${className}`}
            style={{ minWidth: '2.5rem' }}
            title="Use ↑↓ arrows to adjust, Shift+↑↓ for ±10%"
        />
    );
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
        hasMoved: boolean;
    }>({
        isDragging: false,
        stopId: null,
        startX: 0,
        startPosition: 0,
        hasMoved: false,
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
                hasMoved: false,
            });

            onStopSelect(stopId);
        },
        [gradient.stops, onStopSelect],
    );

    useEffect(() => {
        const handleMouseMove = (event: MouseEvent) => {
            if (!dragState.isDragging || !dragState.stopId || !trackRef.current) return;

            event.preventDefault();

            // Check if the mouse has moved enough to consider this a drag
            const moveDistance = Math.abs(event.clientX - dragState.startX);
            if (moveDistance > 3) {
                setDragState((prev) => ({ ...prev, hasMoved: true }));
            }

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
                hasMoved: false,
            });
        };

        const handleMouseLeave = () => {
            if (dragState.isDragging) {
                setDragState({
                    isDragging: false,
                    stopId: null,
                    startX: 0,
                    startPosition: 0,
                    hasMoved: false,
                });
            }
        };

        const handleSelectStart = (event: Event) => {
            event.preventDefault();
        };

        if (dragState.isDragging) {
            document.addEventListener('mousemove', handleMouseMove, { passive: false });
            document.addEventListener('mouseup', handleMouseUp, { passive: false });
            document.addEventListener('mouseleave', handleMouseLeave);
            document.addEventListener('contextmenu', handleMouseUp);
            document.addEventListener('selectstart', handleSelectStart);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('mouseleave', handleMouseLeave);
            document.removeEventListener('contextmenu', handleMouseUp);
            document.removeEventListener('selectstart', handleSelectStart);
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
                opacity: 100,
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

    const gradientCSS = generateGradientCSS(gradient);

    return (
        <div className={`flex flex-col gap-3 p-0 ${className}`}>
            {showPresets && (
                <div>
                    <h4 className="text-foreground-primary mb-2 px-3 text-sm font-medium select-none">
                        Presets
                    </h4>
                    <div className="grid grid-cols-3 gap-2">
                        {PRESET_GRADIENTS.map((preset, index) => (
                            <button
                                key={index}
                                className="border-border hover:border-border-secondary h-8 rounded border transition-colors"
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
                    <h4 className="text-foreground-primary mb-3 text-sm font-medium select-none">
                        Custom
                    </h4>
                )}

                <div className="flex items-center justify-between px-3 pt-2">
                    <Select
                        value={gradient.type}
                        onValueChange={(value) =>
                            onGradientChange({
                                ...gradient,
                                type: value as GradientState['type'],
                            })
                        }
                    >
                        <SelectTrigger
                            size="sm"
                            className="bg-background-secondary border-background-secondary w-24 rounded px-2 text-xs focus:ring-0 focus:outline-none"
                        >
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-background-secondary rounded-md">
                            <SelectItem
                                value="linear"
                                className="focus:bg-background-tertiary cursor-pointer rounded-md text-xs"
                            >
                                Linear
                            </SelectItem>
                            <SelectItem
                                value="radial"
                                className="focus:bg-background-tertiary cursor-pointer rounded-md text-xs"
                            >
                                Radial
                            </SelectItem>
                            <SelectItem
                                value="conic"
                                className="focus:bg-background-tertiary cursor-pointer rounded-md text-xs"
                            >
                                Conic
                            </SelectItem>
                            <SelectItem
                                value="angular"
                                className="focus:bg-background-tertiary cursor-pointer rounded-md text-xs"
                            >
                                Angular
                            </SelectItem>
                            <SelectItem
                                value="diamond"
                                className="focus:bg-background-tertiary cursor-pointer rounded-md text-xs"
                            >
                                Diamond
                            </SelectItem>
                        </SelectContent>
                    </Select>

                    <div className="ml-auto flex items-center gap-0.5">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={flipGradient}
                                    className="text-foreground-secondary hover:text-foreground-primary hover:bg-background-hover rounded p-1.5 transition-colors"
                                    title="Flip gradient"
                                >
                                    <FlipIcon className="h-3.5 w-3.5" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent hideArrow className="mb-1">
                                <p>Flip direction</p>
                            </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={rotateGradient}
                                    className="text-foreground-secondary hover:text-foreground-primary hover:bg-background-hover rounded p-1.5 transition-colors"
                                    title="Rotate gradient"
                                >
                                    <Icons.Rotate className="h-3.5 w-3.5" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent hideArrow className="mb-1">
                                <p>Rotate angle</p>
                            </TooltipContent>
                        </Tooltip>
                    </div>
                </div>

                <div className="relative px-3">
                    <div className="mb-3 flex items-center justify-between">
                        <span className="text-foreground-secondary text-xs select-none">Stops</span>
                        <button
                            onClick={addStop}
                            className="text-foreground-secondary hover:text-foreground-primary hover:bg-background-hover flex h-6 w-6 items-center justify-center rounded px-1 py-1 text-xs transition-colors"
                            title="Add stop"
                        >
                            <Icons.Plus className="h-3.5 w-3.5" />
                        </button>
                    </div>
                    <div
                        ref={trackRef}
                        className="border-border relative h-6 w-full overflow-visible rounded border"
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
                                    className={`absolute top-0 h-7 w-7 -translate-x-1/2 -translate-y-2.5 transform ${
                                        isActive ? 'cursor-grabbing' : 'cursor-grab'
                                    }`}
                                    style={{
                                        left: `${stop.position}%`,
                                        userSelect: 'none',
                                    }}
                                    onMouseDown={(e) => handleStopMouseDown(stop.id, e)}
                                    onClick={() => onStopSelect(stop.id)}
                                    title={`${stop.color} at ${stop.position.toFixed(1)}%`}
                                >
                                    <div className="relative h-full w-full">
                                        {isSelected || isActive ? (
                                            <SelectedStopIcon className="h-7 w-7" />
                                        ) : (
                                            <UnselectedStopIcon className="h-7 w-7" />
                                        )}
                                        <div
                                            className="absolute top-[3.5px] left-1/2 h-4 w-4 -translate-x-1/2 transform rounded border border-white/40"
                                            style={{ backgroundColor: stop.color }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="mb-2 space-y-0.5">
                    {gradient.stops
                        .sort((a, b) => a.position - b.position)
                        .map((stop) => {
                            const isSelected = selectedStopId === stop.id;
                            const canDelete = gradient.stops.length > 1;

                            const handlePositionChange = (newPosition: number) => {
                                const updatedStops = gradient.stops.map((s) =>
                                    s.id === stop.id ? { ...s, position: newPosition } : s,
                                );
                                onGradientChange({
                                    ...gradient,
                                    stops: updatedStops,
                                });
                            };

                            const handleOpacityChange = (newOpacity: number) => {
                                const updatedStops = gradient.stops.map((s) =>
                                    s.id === stop.id ? { ...s, opacity: newOpacity } : s,
                                );
                                onGradientChange({
                                    ...gradient,
                                    stops: updatedStops,
                                });
                            };

                            return (
                                <div
                                    key={stop.id}
                                    className={`flex items-center gap-1 px-3 py-0.5 ${
                                        isSelected ? 'bg-background-active' : ''
                                    }`}
                                >
                                    <div className="flex flex-1 items-center gap-0.5 rounded">
                                        <PercentageInput
                                            value={stop.position}
                                            onChange={handlePositionChange}
                                            className="mr-0.5"
                                            onFocus={() => onStopSelect(stop.id)}
                                        />
                                        <div className="flex-1 overflow-hidden rounded">
                                            <div className="flex flex-1 items-center gap-[1.5px] rounded">
                                                <div className="bg-background-secondary flex flex-1 items-center gap-1 px-1 py-1">
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <button
                                                                className={`h-4.5 w-4.5 flex-shrink-0 cursor-pointer rounded border bg-white/10 transition-all ${
                                                                    isSelected
                                                                        ? 'border-2 border-white shadow-lg'
                                                                        : 'border-foreground-tertiary hover:border-foreground-secondary border'
                                                                } p-0`}
                                                                style={{
                                                                    backgroundColor: stop.color,
                                                                }}
                                                                onClick={() =>
                                                                    onStopSelect(stop.id)
                                                                }
                                                                title={`Click to select (${stop.color.replace('#', '')})`}
                                                            />
                                                        </PopoverTrigger>
                                                        <PopoverContent
                                                            className="w-[224px] overflow-hidden rounded-lg p-0 shadow-xl backdrop-blur-lg"
                                                            side="left"
                                                            align="center"
                                                        >
                                                            <ColorPicker
                                                                color={Color.from(stop.color)}
                                                                onChange={(newColor) =>
                                                                    onStopColorChange(
                                                                        stop.id,
                                                                        newColor,
                                                                    )
                                                                }
                                                                onChangeEnd={(newColor) =>
                                                                    onStopColorChange(
                                                                        stop.id,
                                                                        newColor,
                                                                    )
                                                                }
                                                            />
                                                        </PopoverContent>
                                                    </Popover>
                                                    <span
                                                        className={`min-w-0 flex-1 cursor-pointer text-left text-xs ${
                                                            isSelected
                                                                ? 'text-foreground-primary'
                                                                : 'text-foreground-secondary'
                                                        }`}
                                                        onClick={() => onStopSelect(stop.id)}
                                                    >
                                                        {stop.color.replace('#', '').toUpperCase()}
                                                    </span>
                                                </div>
                                                <PercentageInput
                                                    value={stop.opacity ?? 100}
                                                    onChange={handleOpacityChange}
                                                    onFocus={() => onStopSelect(stop.id)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => canDelete && deleteStop(stop.id)}
                                        className={`flex h-6.5 w-6 items-center justify-center rounded text-xs transition-colors ${
                                            canDelete
                                                ? 'hover:bg-background-secondary text-foreground-secondary hover:text-foreground-primary'
                                                : 'text-foreground-tertiary cursor-not-allowed'
                                        }`}
                                        title={
                                            canDelete ? 'Remove stop' : 'Cannot remove last stop'
                                        }
                                        disabled={!canDelete}
                                    >
                                        <Icons.Minus className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            );
                        })}
                </div>
            </div>
        </div>
    );
};
