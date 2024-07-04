import { generateRowColumnTemplate, getRowColumnCount } from '@/lib/editor/engine/styles/autolayout';
import { ElementStyle } from '@/lib/editor/engine/styles/models';
import { parsedValueToString, stringToParsedValue } from '@/lib/editor/engine/styles/numberUnit';
import { useEffect, useState } from 'react';

interface Props {
    elementStyle: ElementStyle;
    updateElementStyle: (key: string, value: string) => void;
    inputWidth?: string;

}
function RowColInput({ elementStyle, updateElementStyle, inputWidth = "w-full" }: Props) {
    const [value, setValue] = useState("");

    useEffect(() => {
        setValue(getRowColumnCount(elementStyle.value).toString());
    }, [elementStyle.value]);

    const handleInput = (event: any) => {
        const updatedValue = generateRowColumnTemplate(event.target.value);
        updateElementStyle(elementStyle.key, updatedValue);
    };

    const handleKeyDown = (event: any) => {
        let step = 1;
        if (event.key === "Enter") {
            event.target.blur();
            return;
        }
        if (event.shiftKey) step = 10;

        let [parsedNumber, parsedUnit] = stringToParsedValue(event.target.value);

        if (event.key === "ArrowUp") {
            parsedNumber += step;
            event.preventDefault();
        } else if (event.key === "ArrowDown") {
            parsedNumber -= step;
            event.preventDefault();
        }

        const stringValue = parsedValueToString(parsedNumber, parsedUnit);
        setValue(stringValue);
        updateElementStyle(elementStyle.key, stringValue);
    };

    return (
        <input
            type="text"
            className={`${inputWidth} p-[6px] text-xs px-2 rounded border-none text-text bg-surface text-start focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
            placeholder="--"
            value={value}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
        />
    );
}

export default RowColInput;
