import { useEditorEngine } from '@/components/Context';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import { ColorPicker } from '@/components/ui/color';
import { checkPattern } from '@/components/ui/color/checkPattern';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import styled from '@emotion/styled';
import { useEffect } from 'react';
import { twMerge } from 'tailwind-merge';
import { Color } from '/common/color';

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

    useEffect(() => {
        if (isOpen && !editorEngine.history.isInTransaction) {
            editorEngine.history.startTransaction();
            return;
        }
        return () => editorEngine.history.commitTransaction();
    }, [editorEngine, isOpen]);

    function renderColorPicker() {
        const palette = color.palette();
        const colors = Object.keys(palette.colors).filter((code) => code !== '500');
        return (
            <div>
                <ColorPicker
                    color={color}
                    onMouseDown={() => editorEngine.history.startTransaction()}
                    onChange={onChange}
                    onChangeEnd={onChangeEnd}
                />
                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="palette" className="pb-0">
                        <AccordionTrigger className="w-full p-4">
                            <div className="relative h-4 flex items-center justify-center">
                                <p className="text-xs text-muted-foreground">Palette</p>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-4">
                            <div className="grid grid-cols-5 gap-3">
                                {colors.map((level) => (
                                    <div
                                        key={level}
                                        className="w-7 h-7 cursor-pointer rounded-md ring-2 ring-offset-2 ring-offset-background"
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
        <Popover>
            <PopoverTrigger>
                <ColorButton value={color} onClick={() => toggleOpen(!isOpen)} />
            </PopoverTrigger>
            <PopoverContent
                align="end"
                className="bg-background z-10 rounded-lg shadow-xl overflow-hidden"
            >
                {renderColorPicker()}
            </PopoverContent>
        </Popover>
    );
};
