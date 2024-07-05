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

    const [numberInputVal, setNumberInput] = useState<string>("");
    const [unitInputVal, setUnitInput] = useState<string>("");

    useEffect(() => {
        const [newNumber, newUnit] = stringToParsedValue(
            elementStyle.value,
            elementStyle.key === "opacity",
        );
        setNumberInput(newNumber.toString());
        setUnitInput(newUnit);
    }, [elementStyle.value, elementStyle.key]);

    useEffect(() => {
        sendStyleUpdate();
    }, [unitInputVal, numberInputVal]);

    const sendStyleUpdate = () => {
        const stringValue = parsedValueToString(numberInputVal, unitInputVal);
        updateElementStyle(elementStyle.key, stringValue);
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            sendStyleUpdate();
            return;
        }

        let step = 1;
        if (e.shiftKey) step = 10;
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            setNumberInput(prev => (parseInt(prev) + (e.key === "ArrowUp" ? step : -step)).toString());
            e.preventDefault();
        }
    };

    function renderNumberInput() {
        return (
            <input
                ref={numberInputRef}
                type="text"
                placeholder="--"
                value={numberInputVal}
                onKeyDown={handleKeyDown}
                onInput={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setNumberInput(e.target.value);
                }}
                onBlur={sendStyleUpdate}
                className="w-full p-[6px] px-2 rounded border-none text-text bg-surface text-start focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
        )
    }

    function renderUnitInput() {
        return (
            <div className="relative w-full">
                <select
                    value={unitInputVal}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setUnitInput(e.currentTarget.value)}
                    className="p-[6px] w-full px-2 rounded-sm border-none text-text bg-surface text-start appearance-none focus:outline-none focus:ring-0"
                >
                    <option value={auto}>{auto}</option>
                    {unitInputVal !== "" && !elementStyle?.units?.includes(unitInputVal) && <option value={unitInputVal}>{unitInputVal}</option>}
                    {elementStyle.units?.map(option => <option key={option} value={option}>{option}</option>)}
                </select>
                <div
                    className="text-tertiary absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none"
                >
                    <ChevronDownIcon />
                </div>
            </div>
        )
    }

    return elementStyle && elementStyle.units && (
        <div className="flex flex-row gap-2 justify-end text-xs w-32">
            {renderNumberInput()}
            {renderUnitInput()}
        </div >
    );
};

export default NumberUnitInput;
