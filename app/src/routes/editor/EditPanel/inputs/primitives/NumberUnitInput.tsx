import { useEditorEngine } from '@/components/Context/Editor';
import { constructChangeCurried } from '@/lib/editor/styles/inputs';
import { ElementStyle } from '@/lib/editor/styles/models';
import { parsedValueToString, stringToParsedValue } from '@/lib/editor/styles/numberUnit';
import { ChevronDownIcon } from '@radix-ui/react-icons';
import { observer } from 'mobx-react-lite';
import React, { ChangeEvent, useEffect, useState } from 'react';

const NumberUnitInput = observer(
    ({
        elementStyle,
        onValueChange,
    }: {
        elementStyle: ElementStyle;
        onValueChange?: (key: string, value: string) => void;
    }) => {
        const auto = 'auto';
        const editorEngine = useEditorEngine();
        const [numberInputVal, setNumberInput] = useState<string>('');
        const [unitInputVal, setUnitInput] = useState<string>('');

        const constructChange = constructChangeCurried(elementStyle.value);

        useEffect(() => {
            const [newNumber, newUnit] = stringToParsedValue(
                elementStyle.value,
                elementStyle.key === 'opacity',
            );
            setNumberInput(newNumber.toString());
            setUnitInput(newUnit);
        }, [elementStyle]);

        const sendStyleUpdate = (numberVal: string, unitVal: string) => {
            const stringValue = parsedValueToString(numberVal, unitVal);
            editorEngine.style.updateElementStyle(elementStyle.key, constructChange(stringValue));
            onValueChange && onValueChange(elementStyle.key, stringValue);
        };

        const handleNumberInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') {
                sendStyleUpdate(e.currentTarget.value, unitInputVal);
                return;
            }

            let step = 1;
            if (e.shiftKey) {
                step = 10;
            }
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                e.preventDefault();
                const newNumber = (
                    parseInt(numberInputVal) + (e.key === 'ArrowUp' ? step : -step)
                ).toString();

                let unit = unitInputVal;
                if (unitInputVal === '') {
                    unit = 'px';
                    setUnitInput(unit);
                }
                setNumberInput(newNumber);
                sendStyleUpdate(newNumber, unit);
            }
        };

        const handleNumberInputChange = (e: ChangeEvent<HTMLInputElement>) => {
            setNumberInput(e.currentTarget.value);

            let unit = unitInputVal;
            if (unitInputVal === '') {
                unit = 'px';
                setUnitInput(unit);
            }

            sendStyleUpdate(e.currentTarget.value, unit);
        };

        function renderNumberInput() {
            return (
                <input
                    type="text"
                    placeholder="--"
                    value={numberInputVal}
                    onKeyDown={handleNumberInputKeyDown}
                    onChange={handleNumberInputChange}
                    className="w-full p-[6px] px-2 rounded border-none text-text-active bg-bg/75 text-start focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
            );
        }

        function renderUnitInput() {
            return (
                <div className="relative w-full">
                    <select
                        value={unitInputVal}
                        className="p-[6px] w-full px-2 rounded border-none text-text-active bg-bg/75 text-start appearance-none focus:outline-none focus:ring-0"
                        onChange={(e) => {
                            setUnitInput(e.target.value);
                            sendStyleUpdate(numberInputVal, e.target.value);
                        }}
                    >
                        <option value={auto}>{auto}</option>
                        {unitInputVal !== '' && !elementStyle?.units?.includes(unitInputVal) && (
                            <option value={unitInputVal}>{unitInputVal}</option>
                        )}
                        {elementStyle.units?.map((option) => (
                            <option key={option} value={option}>
                                {option}
                            </option>
                        ))}
                    </select>
                    <div className="text-text absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                        <ChevronDownIcon />
                    </div>
                </div>
            );
        }

        return (
            elementStyle &&
            elementStyle.units && (
                <div className="flex flex-row gap-1 justify-end text-xs w-32">
                    {renderNumberInput()}
                    {renderUnitInput()}
                </div>
            )
        );
    },
);

export default NumberUnitInput;
