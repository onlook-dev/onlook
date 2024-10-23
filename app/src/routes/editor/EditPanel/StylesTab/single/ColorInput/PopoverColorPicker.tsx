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
import { ViewGridIcon, ViewHorizontalIcon } from '@radix-ui/react-icons';
import { useEffect, useState } from 'react';
import { twMerge } from 'tailwind-merge';
import { Color, Palette } from '/common/color';

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
                'rounded w-5 h-5 border border-white/20 cursor-pointer shadow bg-background',
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
    const [palette, setPalette] = useState<Palette>(color.palette);

    useEffect(() => {
        if (isOpen && !editorEngine.history.isInTransaction) {
            editorEngine.history.startTransaction();
            return;
        }

        if (!isOpen && editorEngine.history.isInTransaction) {
            editorEngine.history.commitTransaction();
        }
        return () => editorEngine.history.commitTransaction();
    }, [editorEngine, isOpen]);

    useEffect(() => {
        setPalette(color.palette);
    }, [color]);

    function renderColorPicker() {
        return (
            <ColorPicker
                color={color}
                onMouseDown={() => editorEngine.history.startTransaction()}
                onChange={onChange}
                onChangeEnd={(val) => {
                    onChangeEnd?.(val);
                    setPalette(val.palette);
                }}
            />
        );
    }

    function renderPalette() {
        const colors = Object.keys(palette.colors);
        return (
            <div className="px-0.5 py-1.5">
                {viewMode === 'grid' ? (
                    <div className="grid grid-cols-7 gap-1.5 p-1 text-center justify-between">
                        {colors.map((level) => (
                            <div
                                key={level}
                                className="w-6 h-6 content-center cursor-pointer rounded border-[0.5px] border-foreground-tertiary/50"
                                style={{ backgroundColor: palette.colors[parseInt(level)] }}
                                onClick={() =>
                                    onChangeEnd(Color.from(palette.colors[parseInt(level)]))
                                }
                            >
                                {/* Commenting out so that we can use this for tooltips over these grid elements */}
                                {/* <p
                                    className={cn(
                                        'text-xs text-white drop-shadow-lg',
                                        parseInt(level) < 500 ? 'invert' : '',
                                    )}
                                > */}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col">
                        {colors.map((level) => (
                            <div
                                className="gap-2 hover:bg-background-secondary p-1 flex align-center cursor-pointer rounded-md group"
                                key={level}
                                onClick={() =>
                                    onChangeEnd(Color.from(palette.colors[parseInt(level)]))
                                }
                            >
                                <div
                                    key={level}
                                    className="w-5 h-5 content-center rounded border-[0.5px] border-foreground-tertiary/50"
                                    style={{ backgroundColor: palette.colors[parseInt(level)] }}
                                />
                                <div className="text-small text-foreground-secondary group-hover:text-foreground-primary">
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
                className="min-w-12 bg-background/90 backdrop-blur-lg z-10 rounded-lg p-0 shadow-xl overflow-hidden"
            >
                <div className="flex flex-col justify-between items-center">
                    {renderColorPicker()}
                    <PopoverSeparator />
                    <div className="flex flex-row items-center justify-between w-full px-2.5 py-1.5">
                        <span className="text-foreground-secondary text-smallPlus">
                            {palette.name}
                        </span>
                        <button
                            aria-label={`Toggle ${viewMode === 'grid' ? 'list' : 'grid'} mode`}
                            className="text-foreground-tertiary hover:text-foreground-hover rounded"
                            onClick={() => {
                                setViewMode(viewMode === 'grid' ? 'list' : 'grid');
                            }}
                        >
                            {viewMode === 'grid' ? (
                                <ViewGridIcon className="h-4 w-4" />
                            ) : (
                                <ViewHorizontalIcon className="h-4 w-4" />
                            )}
                        </button>
                    </div>
                    <PopoverSeparator />
                    <PopoverScrollArea className="h-32 px-1">{renderPalette()}</PopoverScrollArea>
                </div>
            </PopoverContent>
        </Popover>
    );
};
