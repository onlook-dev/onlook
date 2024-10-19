import { useEditorEngine } from '@/components/Context';
import { useEffect } from 'react';
import { Popover } from 'react-tiny-popover';
import { ColorPicker } from '@/components/ui/color';
import { Color } from '/common/color';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';

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

    useEffect(() => {
        return () => editorEngine.history.commitTransaction();
    }, [editorEngine, isOpen]);

    function renderColorPicker() {
        const palette = color.palette();
        const colors = Object.keys(palette.colors).filter((code) => code !== '500');
        return (
            <div>
                <ColorPicker
                    className="bg-background"
                    color={color}
                    onMouseDown={() => editorEngine.history.startTransaction()}
                    onChange={onChange}
                    onChangeEnd={onChangeEnd}
                />
                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="palette" className="pb-0">
                        <AccordionTrigger className="w-full bg-background p-4">
                            <div className="relative h-4 flex items-center justify-center">
                                <p className="text-xs text-muted-foreground bg-popover">Palette</p>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="bg-background p-4">
                            <div className="flex items-center flex-wrap max-w-[200px] gap-4">
                                {colors.map((level) => (
                                    <div
                                        key={level}
                                        className="w-6 h-6 cursor-pointer rounded-md ring-2 ring-offset-2 ring-offset-background"
                                        style={{ backgroundColor: palette.colors[parseInt(level)] }}
                                        onClick={() =>
                                            onChangeEnd(Color.from(palette.colors[parseInt(level)]))
                                        }
                                    />
                                ))}
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </div>
        );
    }

    return (
        <Popover
            isOpen={isOpen}
            positions={['left', 'bottom', 'top', 'right']} // preferred positions by priority
            content={renderColorPicker()}
            onClickOutside={() => toggleOpen(false)}
        >
            <button
                className={`rounded w-5 h-5 border border-white/20 cursor-pointer shadow ${!color ? 'bg-background' : ''}`}
                style={{ backgroundColor: color.toHex() }}
                onClick={() => toggleOpen(!isOpen)}
            ></button>
        </Popover>
    );
};
