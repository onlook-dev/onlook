import { stringToHex } from '@/lib/editor/engine/styles/colors';
import { ElementStyle } from '@/lib/editor/engine/styles/models';
import { Cross2Icon, PlusIcon } from '@radix-ui/react-icons';
import { parse } from 'culori';
import { useEffect, useState } from 'react';

interface ColorInputProps {
    elementStyle: ElementStyle;
    updateElementStyle: (key: string, value: string) => void;
}

export default function ColorInput({ elementStyle, updateElementStyle }: ColorInputProps) {
    const [inputString, setInputString] = useState(() => stringToHex(elementStyle.value));
    const [isNoneInput, setIsNoneInput] = useState(inputString === 'initial' || inputString === '');

    useEffect(() => {
        setInputString(stringToHex(elementStyle.value));
        setIsNoneInput(inputString === 'initial' || inputString === '');
    }, [elementStyle]);

    const formatColorInput = (colorInput: string): string => {
        if (/^[0-9A-F]{6}$/i.test(colorInput)) {
            return '#' + colorInput;
        }
        return colorInput;
    };

    return (
        <div className="w-32 p-[6px] gap-2 bg-surface flex flex-row rounded-sm cursor-pointer">
            <div className="overflow-hidden w-5 h-5 border-transparent rounded-[2px] relative">
                <input
                    type="color"
                    className="border-transparent absolute w-10 h-10 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 cursor-pointer"
                    value={inputString}
                    onChange={(event) => {
                        const newValue = event.target.value;
                        setInputString(newValue);
                        updateElementStyle(elementStyle.key, newValue);
                    }}
                />
            </div>
            <input
                className="w-16 text-xs border-none text-text bg-transparent text-start focus:outline-none focus:ring-0"
                type="text"
                value={isNoneInput ? '' : inputString}
                placeholder="None"
                onKeyDown={(e) => {
                    if (e.key === "Enter") {
                        e.currentTarget.blur();
                    }
                }}
                onChange={(event) => {
                    const formattedColor = formatColorInput(event.target.value);
                    if (parse(formattedColor) === undefined) {
                        console.error("Invalid color");
                    } else {
                        setInputString(formattedColor);
                        updateElementStyle(elementStyle.key, formattedColor);
                    }
                }}
            />
            <button
                className="text-tertiary"
                onClick={() => {
                    const newValue = isNoneInput ? "#000000" : "";
                    setInputString(newValue);
                    updateElementStyle(elementStyle.key, newValue);
                }}
            >
                {isNoneInput ? <PlusIcon /> : <Cross2Icon />}
            </button>
        </div>
    );
}
