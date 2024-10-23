import { useEditorEngine } from '@/components/Context';
import { SingleStyle } from '@/lib/editor/styles/models';
import {
    getDefaultUnit,
    handleNumberInputKeyDown,
    parsedValueToString,
    stringToParsedValue,
} from '@/lib/editor/styles/numberUnit';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';

const TextInput = observer(
    ({
        elementStyle,
        onValueChange,
    }: {
        elementStyle: SingleStyle;
        onValueChange?: (key: string, value: string) => void;
    }) => {
        const editorEngine = useEditorEngine();
        const [value, setValue] = useState(elementStyle.defaultValue);
        const [isFocused, setIsFocused] = useState(false);

        useEffect(() => {
            if (isFocused || !editorEngine.style.selectedStyle) {
                return;
            }
            const newValue = elementStyle.getValue(editorEngine.style.selectedStyle?.styles);
            setValue(newValue);
        }, [editorEngine.style.selectedStyle, isFocused]);

        const sendStyleUpdate = (newValue: string) => {
            editorEngine.style.updateElementStyle(elementStyle.key, newValue);
            onValueChange && onValueChange(elementStyle.key, newValue);
        };

        const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            let newValue = e.currentTarget.value;
            setValue(newValue);

            const { numberVal, unitVal } = stringToParsedValue(newValue);
            const newUnit = getDefaultUnit(unitVal);
            newValue = parsedValueToString(numberVal, newUnit);
            sendStyleUpdate(newValue);
        };

        const handleFocus = () => {
            setIsFocused(true);
            editorEngine.history.startTransaction();
        };

        const handleBlur = () => {
            setIsFocused(false);
            editorEngine.history.commitTransaction();
        };

        return (
            <input
                type="text"
                className={`w-full p-[6px] text-xs px-2 rounded border-none text-active bg-background-onlook/75 text-start focus:outline-none focus:ring-0 appearance-none`}
                placeholder="--"
                value={value}
                onChange={handleInputChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onKeyDown={(e) =>
                    handleNumberInputKeyDown(e, elementStyle.key, value, setValue, sendStyleUpdate)
                }
            />
        );
    },
);

export default TextInput;
