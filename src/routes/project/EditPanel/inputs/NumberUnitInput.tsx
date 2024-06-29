import { ElementStyle } from '@/lib/editor/engine/styles/models';
import { parsedValueToString, stringToParsedValue } from '@/lib/editor/engine/styles/numberUnit';
import { ChevronDownIcon } from '@radix-ui/react-icons';
import React, { useEffect, useRef, useState } from 'react';

interface Props {
    elementStyle: ElementStyle;
    updateElementStyle: (key: string, value: string) => void;
}

const NumberUnitInput = ({ elementStyle, updateElementStyle }: Props) => {
    const numberInputRef = useRef<HTMLInputElement>(null);
    const auto = "auto";

    // State for parsed number and unit
    const [parsedNumber, setParsedNumber] = useState<number>(0);
    const [parsedUnit, setParsedUnit] = useState<string>("");

    // Effect to parse value initially and on value or key changes
    useEffect(() => {
        const [newNumber, newUnit] = stringToParsedValue(
            elementStyle.value,
            elementStyle.key === "opacity",
        );
        setParsedNumber(newNumber);
        setParsedUnit(newUnit);
    }, [elementStyle.value, elementStyle.key]);

    const isEmpty = () => {
        return isNaN(parsedNumber) || parsedNumber === 0 || parsedUnit === "";
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        let step = 1;
        if (e.key === "Enter") {
            e.currentTarget.blur();
            return;
        }
        if (e.shiftKey) step = 10;

        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            setParsedNumber(prev => prev + (e.key === "ArrowUp" ? step : -step));
            e.preventDefault();
        }

        if (parsedNumber && (parsedUnit === auto || parsedUnit === "")) {
            setParsedUnit("px");
        }

        const stringValue = parsedValueToString(parsedNumber, parsedUnit);
        updateElementStyle(elementStyle.key, stringValue);
    };

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        const matches = value.match(/([-+]?[0-9]*\.?[0-9]+)([a-zA-Z%]*)/);

        if (matches && elementStyle.units && elementStyle.units.includes(matches[2])) {
            setParsedNumber(parseFloat(matches[1]));
            setParsedUnit(matches[2]);
        } else {
            setParsedNumber(parseFloat(value));
        }

        if (parsedNumber && (parsedUnit === auto || parsedUnit === "")) {
            setParsedUnit("px");
        }

        const stringValue = parsedValueToString(parsedNumber, parsedUnit);
        updateElementStyle(elementStyle.key, stringValue);
    };

    return elementStyle && elementStyle.units && (
        <div className="flex flex-row gap-2 justify-end text-xs w-32">
            <input
                ref={numberInputRef}
                type="text"
                placeholder="--"
                value={isEmpty() ? "" : parsedNumber.toString()}
                onKeyDown={handleKeyDown}
                onInput={handleInput}
                className="w-full p-[6px] px-2 rounded border-none text-text bg-surface text-start focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <div className="relative w-full">
                <select
                    value={isEmpty() ? auto : parsedUnit}
                    onInput={(e: React.ChangeEvent<HTMLSelectElement>) => {
                        const newValue = e.target.value;
                        setParsedUnit(newValue);
                        const stringValue = parsedValueToString(parsedNumber, newValue);
                        updateElementStyle(elementStyle.key, stringValue);
                    }}
                    className="p-[6px] w-full px-2 rounded-sm border-none text-text bg-surface text-start appearance-none focus:outline-none focus:ring-0"
                >
                    <option value={auto}>{auto}</option>
                    {parsedUnit !== "" && !elementStyle.units.includes(parsedUnit) && <option value={parsedUnit}>{parsedUnit}</option>}
                    {elementStyle.units?.map(option => <option key={option} value={option}>{option}</option>)}
                </select>
                <div
                    className="text-tertiary absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none"
                >
                    <ChevronDownIcon />
                </div>
            </div>
        </div>
    );
};

export default NumberUnitInput;
