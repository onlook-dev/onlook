import { useEditorEngine } from '@/components/Context';
import { ColorPicker } from '@onlook/ui/color-picker';
import { Icons } from '@onlook/ui/icons';
import { PopoverScrollArea, PopoverSeparator } from '@onlook/ui/popover';
import { Color, type Palette } from '@onlook/utility';
import { useEffect, useState } from 'react';

interface ColorPickerProps {
    color: Color;
    onChange: (color: Color) => void;
    onChangeEnd: (color: Color) => void;
}

const ColorPickerContent: React.FC<ColorPickerProps> = ({ color, onChange, onChangeEnd }) => {
    const editorEngine = useEditorEngine();
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [palette, setPalette] = useState<Palette>(color.palette);

    useEffect(() => {
        setPalette(color.palette);
    }, [color]);

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
                                style={{ backgroundColor: palette.colors[Number.parseInt(level)] }}
                                onClick={() =>
                                    onChangeEnd(Color.from(palette.colors[Number.parseInt(level)]))
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
                                    onChangeEnd(Color.from(palette.colors[Number.parseInt(level)]))
                                }
                            >
                                <div
                                    key={level}
                                    className="w-5 h-5 content-center rounded border-[0.5px] border-foreground-tertiary/50"
                                    style={{
                                        backgroundColor: palette.colors[Number.parseInt(level)],
                                    }}
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
        <div className="flex flex-col justify-between items-center">
            <ColorPicker
                color={color}
                onMouseDown={() => editorEngine.history.startTransaction()}
                onChange={onChange}
                onChangeEnd={(val) => {
                    onChangeEnd?.(val);
                    setPalette(val.palette);
                }}
            />
            <PopoverSeparator />
            <div className="flex flex-row items-center justify-between w-full px-2.5 py-1.5">
                <span className="text-foreground-secondary text-smallPlus">{palette.name}</span>
                <button
                    aria-label={`Toggle ${viewMode === 'grid' ? 'list' : 'grid'} mode`}
                    className="text-foreground-tertiary hover:text-foreground-hover rounded"
                    onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                >
                    {viewMode === 'grid' ? (
                        <Icons.ViewGrid className="h-4 w-4" />
                    ) : (
                        <Icons.ViewHorizontal className="h-4 w-4" />
                    )}
                </button>
            </div>
            <PopoverSeparator />
            <PopoverScrollArea className="h-32 px-1">{renderPalette()}</PopoverScrollArea>
        </div>
    );
};

export default ColorPickerContent;
