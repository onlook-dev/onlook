import { useEditorEngine } from '@/components/Context';
import { Icons } from '@/components/icons';
import { toast } from '@/components/ui/use-toast';
import { SingleStyle } from '@/lib/editor/styles/models';
import {
    handleNumberInputKeyDown,
    parsedValueToString,
    stringToParsedValue,
} from '@/lib/editor/styles/numberUnit';
import { observer } from 'mobx-react-lite';
import { ChangeEvent, useEffect, useState } from 'react';

const NumberUnitInput = observer(
    ({
        elementStyle,
        onValueChange,
    }: {
        elementStyle: SingleStyle;
        onValueChange?: (key: string, value: string) => void;
    }) => {
        const editorEngine = useEditorEngine();
        const [value, setValue] = useState(elementStyle.defaultValue);

        useEffect(() => {
            const selectedStyle = editorEngine.style.selectedStyle;
            if (!selectedStyle) {
                return;
            }
            const newValue = elementStyle.getValue(selectedStyle.styles);
            setValue(newValue);
        }, [editorEngine.style.selectedStyle]);

        const sendStyleUpdate = (newValue: string) => {
            editorEngine.style.updateElementStyle(elementStyle.key, newValue);
            onValueChange && onValueChange(elementStyle.key, newValue);
        };

        const handleNumberInputChange = (e: ChangeEvent<HTMLInputElement>) => {
            const { unitVal } = stringToParsedValue(value, elementStyle.key === 'opacity');

            const newNumber = e.currentTarget.value;
            const parsedNewNumber = parseFloat(newNumber);
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

            const newUnit = unitVal === '' ? 'px' : unitVal;
            const newValue = parsedValueToString(newNumber, newUnit);

            setValue(newValue);
            sendStyleUpdate(newValue);
        };

        const handleUnitInputChange = (e: ChangeEvent<HTMLSelectElement>) => {
            const { numberVal } = stringToParsedValue(value, elementStyle.key === 'opacity');

            const newUnit = e.currentTarget.value;
            const newValue = parsedValueToString(numberVal, newUnit);

            setValue(newValue);
            sendStyleUpdate(newValue);
        };

        const renderNumberInput = () => {
            return (
                <input
                    type="text"
                    placeholder="--"
                    value={stringToParsedValue(value, elementStyle.key === 'opacity').numberVal}
                    onKeyDown={(e) =>
                        handleNumberInputKeyDown(e, elementStyle, value, setValue, sendStyleUpdate)
                    }
                    onChange={handleNumberInputChange}
                    className="w-full p-[6px] px-2 rounded border-none text-foreground-active bg-background-onlook/75 text-start focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    onFocus={editorEngine.history.startTransaction}
                    onBlur={editorEngine.history.commitTransaction}
                />
            );
        };

        const renderUnitInput = () => {
            return (
                <div className="relative w-full">
                    <select
                        value={stringToParsedValue(value, elementStyle.key === 'opacity').unitVal}
                        className="p-[6px] w-full px-2 rounded border-none text-foreground-active bg-background-onlook/75 text-start appearance-none focus:outline-none focus:ring-0"
                        onChange={handleUnitInputChange}
                    >
                        {elementStyle.params?.units?.map((option) => (
                            <option key={option} value={option}>
                                {option}
                            </option>
                        ))}
                    </select>
                    <div className="text-foreground-onlook absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
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
