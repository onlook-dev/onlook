import { useEditorEngine } from '@/components/Context';
import type { SingleStyle } from '@/lib/editor/styles/models';
import {
    handleNumberInputKeyDown,
    parsedValueToString,
    stringToParsedValue,
} from '@/lib/editor/styles/numberUnit';
import { Icons } from '@onlook/ui/icons';
import { toast } from '@onlook/ui/use-toast';
import { observer } from 'mobx-react-lite';
import { type ChangeEvent, useEffect, useState } from 'react';

const NumberUnitInput = observer(
    ({
        elementStyle,
        onValueChange,
    }: {
        elementStyle: SingleStyle;
        onValueChange?: (key: string, value: string) => void;
    }) => {
        const editorEngine = useEditorEngine();
        const [numberValue, setNumberValue] = useState<string>('');
        const [unitValue, setUnitValue] = useState<string>('');
        const [prevNumberValue, setPrevNumberValue] = useState<string>('');

        useEffect(() => {
            const selectedStyle = editorEngine.style.selectedStyle;
            if (!selectedStyle) {
                return;
            }
            const newValue = elementStyle.getValue(selectedStyle.styles);
            const { numberVal, unitVal } = stringToParsedValue(
                newValue,
                elementStyle.key === 'opacity',
            );
            setNumberValue(numberVal);
            setUnitValue(unitVal);
        }, [editorEngine.style.selectedStyle]);

        const sendStyleUpdate = (newValue: string) => {
            editorEngine.style.update(elementStyle.key, newValue);
            onValueChange && onValueChange(elementStyle.key, newValue);
        };

        const handleNumberInputChange = (e: ChangeEvent<HTMLInputElement>) => {
            setNumberValue(e.currentTarget.value);

            const newNumber = e.currentTarget.value;
            const parsedNewNumber = Number.parseFloat(newNumber);
            const { min, max } = elementStyle.params || {};

            if (min !== undefined && parsedNewNumber < min) {
                toast({
                    title: `Invalid Input`,
                    description: `Value for ${elementStyle.displayName} cannot be less than ${min}`,
                    variant: 'destructive',
                });
                return;
            }

            if (max !== undefined && parsedNewNumber > max) {
                toast({
                    title: `Invalid Input`,
                    description: `Value for ${elementStyle.displayName} cannot be more than ${max}`,
                    variant: 'destructive',
                });
                return;
            }

            const { unitVal } = stringToParsedValue(
                e.currentTarget.value,
                elementStyle.key === 'opacity',
            );
            const newUnit = unitVal === '' ? 'px' : unitVal;
            setUnitValue(newUnit);
        };

        const handleUnitInputChange = (e: ChangeEvent<HTMLSelectElement>) => {
            const newUnit = e.currentTarget.value;
            const newValue = parsedValueToString(numberValue, newUnit);
            setUnitValue(newUnit);
            sendStyleUpdate(newValue);
        };

        const setValueCallback = (value: string) => {
            const { numberVal, unitVal } = stringToParsedValue(
                value,
                elementStyle.key === 'opacity',
            );
            setNumberValue(numberVal);
            setUnitValue(unitVal);
        };

        const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
            if (e.currentTarget.value !== prevNumberValue) {
                const value = parsedValueToString(
                    Number.parseFloat(numberValue).toString(),
                    unitValue,
                );
                sendStyleUpdate(value);
            }
            editorEngine.history.commitTransaction();
        };

        const renderNumberInput = () => {
            return (
                <input
                    type="text"
                    placeholder="--"
                    value={numberValue}
                    onKeyDown={(e) =>
                        handleNumberInputKeyDown(
                            e,
                            elementStyle,
                            parsedValueToString(numberValue, unitValue),
                            setValueCallback,
                            sendStyleUpdate,
                        )
                    }
                    onChange={handleNumberInputChange}
                    className="w-full p-[6px] px-2 rounded border-none text-foreground-active bg-background-onlook/75 text-start focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    onFocus={() => {
                        setPrevNumberValue(numberValue);
                        editorEngine.history.startTransaction;
                    }}
                    onBlur={handleBlur}
                />
            );
        };

        const renderUnitInput = () => {
            return (
                <div className="relative w-full group">
                    <select
                        value={unitValue}
                        className="p-[6px] w-full px-2 rounded border-none text-foreground-active bg-background-onlook/75 text-start appearance-none focus:outline-none focus:ring-0"
                        onChange={handleUnitInputChange}
                    >
                        {elementStyle.params?.units?.map((option) => (
                            <option key={option} value={option}>
                                {option}
                            </option>
                        ))}
                    </select>
                    <div className="text-foreground-onlook group-hover:text-foreground-hover absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                        <Icons.ChevronDown />
                    </div>
                </div>
            );
        };

        return (
            <div className="flex flex-row gap-1 justify-end text-xs w-32">
                {renderNumberInput()}
                {renderUnitInput()}
            </div>
        );
    },
);

export default NumberUnitInput;
