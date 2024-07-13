import { stringToHex } from '@/lib/editor/engine/styles/colors';
import { ElementStyle } from '@/lib/editor/engine/styles/models';
import { Cross2Icon, PlusIcon } from '@radix-ui/react-icons';
import { parse } from 'culori';
import { useEffect, useState } from 'react';
import { PopoverPicker } from './PopoverColorPicker';

interface ColorInputProps {
    elementStyle: ElementStyle;
    updateElementStyle: (key: string, value: string) => void;
}

export default function ColorInput({ elementStyle, updateElementStyle }: ColorInputProps) {
    const [inputString, setInputString] = useState(() => stringToHex(elementStyle.value));

    useEffect(() => {
        setInputString(stringToHex(elementStyle.value));
    }, [elementStyle]);

    function isNoneInput() {
        return inputString === 'initial' || inputString === '';
    }

    function formatColorInput(colorInput: string): string {
        if (/^[0-9A-F]{6}$/i.test(colorInput)) {
            return '#' + colorInput;
        }
        return colorInput;
    }

    function renderColorInput() {
        return (
            <PopoverPicker
                color={inputString}
                onChange={(color: string) => {
                    updateElementStyle(elementStyle.key, color);
                    setInputString(color);
                }}
            />
        );
    }

    function renderTextInput() {
        return (
            <input
                className="w-16 text-xs border-none text-text bg-transparent text-start focus:outline-none focus:ring-0"
                type="text"
                value={isNoneInput() ? '' : inputString}
                placeholder="None"
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.currentTarget.blur();
                    }
                }}
                onChange={(event) => {
                    const formattedColor = formatColorInput(event.target.value);
                    if (parse(formattedColor) === undefined) {
                        console.error('Invalid color');
                    } else {
                        setInputString(formattedColor);
                        updateElementStyle(elementStyle.key, formattedColor);
                    }
                }}
            />
        );
    }

    function renderControlButton() {
        return (
            <button
                className="text-tertiary"
                onClick={() => {
                    const newValue = isNoneInput() ? '#000000' : '';
                    setInputString(newValue);
                    updateElementStyle(elementStyle.key, newValue);
                }}
            >
                {isNoneInput() ? <PlusIcon /> : <Cross2Icon />}
            </button>
        );
    }

    return (
        <div className="w-32 p-[6px] gap-2 bg-surface flex flex-row rounded-sm cursor-pointer">
            {renderColorInput()}
            {renderTextInput()}
            {renderControlButton()}
        </div>
    );
}
