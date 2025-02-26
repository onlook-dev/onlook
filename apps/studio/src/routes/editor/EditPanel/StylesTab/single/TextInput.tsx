import { useEditorEngine } from '@/components/Context';
import type { SingleStyle } from '@/lib/editor/styles/models';
import {
    getDefaultUnit,
    handleNumberInputKeyDown,
    parsedValueToString,
    stringToParsedValue,
} from '@/lib/editor/styles/numberUnit';
import { toast } from '@onlook/ui/use-toast';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import type React from 'react';
import { useEffect, useState } from 'react';

const TextInput = observer(
    ({
        elementStyle,
        onValueChange,
        className,
        disabled,
    }: {
        elementStyle: SingleStyle;
        onValueChange?: (key: string, value: string) => void;
        className?: string;
        disabled?: boolean;
    }) => {
        const editorEngine = useEditorEngine();
        const [value, setValue] = useState(elementStyle.defaultValue);
        const [isFocused, setIsFocused] = useState(false);
        const [prevValue, setPrevValue] = useState(elementStyle.defaultValue);
        useEffect(() => {
            if (isFocused || !editorEngine.style.selectedStyle) {
                return;
            }
            const newValue = elementStyle.getValue(editorEngine.style.selectedStyle?.styles);
            setValue(newValue);
        }, [editorEngine.style.selectedStyle, isFocused]);

        const sendStyleUpdate = (newValue: string) => {
            editorEngine.style.update(elementStyle.key, newValue);
            onValueChange && onValueChange(elementStyle.key, newValue);
        };

        const emitValue = (newValue: string) => {
            const { numberVal, unitVal } = stringToParsedValue(newValue);
            const parsedNum = parseFloat(numberVal);
            const newUnit = getDefaultUnit(unitVal);

            newValue = parsedValueToString(parsedNum.toString(), newUnit);

            const { min, max } = elementStyle.params || {};
            if (min !== undefined && parsedNum < min) {
                toast({
                    title: 'Invalid Input',
                    description: `Value for ${elementStyle.displayName} cannot be less than ${min}`,
                    variant: 'destructive',
                });
                return;
            }
            if (max !== undefined && parsedNum > max) {
                toast({
                    title: 'Invalid Input',
                    description: `Value for ${elementStyle.displayName} cannot be greater than ${max}`,
                    variant: 'destructive',
                });
                return;
            }

            setValue(newValue);
            sendStyleUpdate(newValue);
        };

        const handleFocus = () => {
            setPrevValue(value);
            setIsFocused(true);
            editorEngine.history.startTransaction();
        };

        const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
            setIsFocused(false);
            if (prevValue !== e.currentTarget.value) {
                emitValue(e.currentTarget.value);
            }
            editorEngine.history.commitTransaction();
        };
        return (
            <input
                type="text"
                className={cn(
                    'w-full p-[6px] text-xs px-2 rounded border-none text-active bg-background-onlook/75 text-start focus:outline-none focus:ring-0 appearance-none',
                    className,
                )}
                placeholder="--"
                value={value}
                onChange={(e) => setValue(e.currentTarget.value)}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onKeyDown={(e) =>
                    handleNumberInputKeyDown(e, elementStyle, value, setValue, sendStyleUpdate)
                }
                disabled={disabled}
            />
        );
    },
);

export default TextInput;
