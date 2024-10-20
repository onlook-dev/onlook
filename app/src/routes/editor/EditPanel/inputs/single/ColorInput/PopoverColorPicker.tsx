import { useEditorEngine } from '@/components/Context';
import { ColorPicker } from '@/components/ui/color';
import { checkPattern } from '@/components/ui/color/checkPattern';
import {
    Popover,
    PopoverContent,
    PopoverScrollArea,
    PopoverSeparator,
    PopoverTrigger,
} from '@/components/ui/popover';
import styled from '@emotion/styled';
import { useEffect, useState } from 'react';
import { twMerge } from 'tailwind-merge';
import { Color } from '/common/color';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ViewGridIcon, ViewHorizontalIcon } from '@radix-ui/react-icons';
import { cn } from '@/lib/utils';

const ColorButtonBackground = styled.div`
    ${checkPattern('white', '#aaa', '8px')}
`;

const ColorButton: React.FC<
    {
        value?: Color;
    } & React.PropsWithoutRef<JSX.IntrinsicElements['div']>
> = ({ className, value, ...props }) => {
    return (
        <div
            {...props}
            className={twMerge(
                'rounded w-5 h-5 border border-white/20 cursor-pointer shadow p-0.5 bg-background',
                className,
            )}
        >
            <ColorButtonBackground className="w-full h-full rounded-sm overflow-hidden">
                <div
                    className="w-full h-full"
                    style={{
                        backgroundColor: value?.toHex() ?? 'transparent',
                    }}
                />
            </ColorButtonBackground>
        </div>
    );
};

interface PopoverPickerProps {
    color: Color;
    onChange: (color: Color) => void;
    onChangeEnd: (color: Color) => void;
    isOpen: boolean;
    toggleOpen: (isOpen: boolean) => void;
}

export const PopoverPicker = ({
    color,
    onChange,
    onChangeEnd,
    isOpen,
    toggleOpen,
}: PopoverPickerProps) => {
    const editorEngine = useEditorEngine();

    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    useEffect(() => {
        if (isOpen && !editorEngine.history.isInTransaction) {
            editorEngine.history.startTransaction();
            return;
        }
        return () => editorEngine.history.commitTransaction();
    }, [editorEngine, isOpen]);

    function renderColorPicker() {
        return (
            <ColorPicker
                color={color}
                onMouseDown={() => editorEngine.history.startTransaction()}
                onChange={onChange}
                onChangeEnd={onChangeEnd}
            />
        );
    }

    function renderPalette() {
        const palette = color.palette();
        const colors = Object.keys(palette.colors).filter((code) => code !== '500');
        return (
            <div className="p-4">
                {viewMode === 'grid' ? (
                    <div className="grid grid-cols-5 gap-3 text-center justify-between">
                        {colors.map((level) => (
                            <div
                                key={level}
                                className="w-7 h-7  content-center cursor-pointer rounded-md ring-1 ring-offset-2 ring-offset-background"
                                style={{ backgroundColor: palette.colors[parseInt(level)] }}
                                onClick={() =>
                                    onChangeEnd(Color.from(palette.colors[parseInt(level)]))
                                }
                            >
                                <p
                                    className={cn(
                                        'text-xs text-white drop-shadow-lg',
                                        parseInt(level) < 500 ? 'invert' : '',
                                    )}
                                >
                                    {level}
                                </p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="-ml-4">
                        {colors.map((level) => (
                            <div className="h-9 gap-2 flex px-3" key={level}>
                                <div
                                    key={level}
                                    className="w-5 h-5 content-center cursor-pointer rounded-md ring-1 ring-offset-2 ring-offset-background"
                                    style={{ backgroundColor: palette.colors[parseInt(level)] }}
                                    onClick={() =>
                                        onChangeEnd(Color.from(palette.colors[parseInt(level)]))
                                    }
                                />
                                <div>
                                    <span>
                                        {palette.name}-{level}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <Popover>
            <PopoverTrigger>
                <ColorButton value={color} onClick={() => toggleOpen(!isOpen)} />
            </PopoverTrigger>
            <PopoverContent
                align="end"
                className="min-w-64 bg-background z-10 rounded-lg shadow-xl overflow-hidden"
            >
                <div className="flex flex-col justify-between items-center">
                    {renderColorPicker()}

                    <PopoverSeparator className="mb-6 mt-2" />
                    <div className="z-[0] absolute inset-0 flex justify-between items-center top-[168px]">
                        <span className="bg-background px-4 text-blue-500 uppercase">
                            {color.palette().name}
                        </span>
                        <div className="bg-background px-4">
                            <ToggleGroup
                                size={'sm'}
                                type="single"
                                value={viewMode}
                                onValueChange={(value) => {
                                    if (value) {
                                        setViewMode(value as 'grid' | 'list');
                                    }
                                }}
                            >
                                <ToggleGroupItem
                                    value="grid"
                                    aria-label="Toggle grid mode"
                                    className="data-[state=on]:bg-background"
                                >
                                    <ViewGridIcon className="h-4 w-4" />
                                </ToggleGroupItem>
                                <ToggleGroupItem
                                    value="list"
                                    aria-label="Toggle list mode"
                                    className="data-[state=on]:bg-background"
                                >
                                    <ViewHorizontalIcon className="h-4 w-4" />
                                </ToggleGroupItem>
                            </ToggleGroup>
                        </div>
                    </div>
                    <PopoverScrollArea className="h-28 -mt-2">{renderPalette()}</PopoverScrollArea>
                </div>
            </PopoverContent>
        </Popover>
    );
};
