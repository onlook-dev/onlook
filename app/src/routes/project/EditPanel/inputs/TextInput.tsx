import { ElementStyle } from '@/lib/editor/engine/styles/models';
import { parsedValueToString, stringToParsedValue } from '@/lib/editor/engine/styles/numberUnit';
import { appendCssUnit } from '@/lib/editor/engine/styles/units';
import React, { useEffect, useState } from 'react';
import { useEditorEngine } from '../..';
import { constructChangeCurried, UpdateElementStyleCallback } from './InputsCommon';

interface Props {
    elementStyle: ElementStyle;
    updateElementStyle: UpdateElementStyleCallback;
    inputWidth?: string;
}

const TextInput = ({ elementStyle, updateElementStyle, inputWidth = 'w-full' }: Props) => {
    const [localValue, setLocalValue] = useState(elementStyle.value);
    const [isFocused, setIsFocused] = useState(false);
    const editorEngine = useEditorEngine();

    const constructChange = constructChangeCurried(elementStyle.value);

    useEffect(() => {
        if (!isFocused) {
            setLocalValue(elementStyle.value);
        }
    }, [isFocused, elementStyle]);

    const onFocus = () => {
        setIsFocused(true);
        editorEngine.history.startTransaction();
    };

    const onBlur = () => {
        setIsFocused(false);
        editorEngine.history.commitTransaction();
    };

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.currentTarget.value;
        setLocalValue(newValue);
        updateElementStyle(elementStyle.key, constructChange(appendCssUnit(newValue)));
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        let step = 1;
        if (e.key === 'Enter') {
            e.currentTarget.blur();
            return;
        }

        if (e.shiftKey) {
            step = 10;

            if (e.key === 'Shift') {
                return;
            }
        }

        let [parsedNumber, parsedUnit] = stringToParsedValue(localValue);

        if (e.key === 'ArrowUp') {
            parsedNumber += step;
            e.preventDefault();
        } else if (e.key === 'ArrowDown') {
            parsedNumber -= step;
            e.preventDefault();
        }

        const stringValue = parsedValueToString(parsedNumber, parsedUnit);
        setLocalValue(stringValue);
        updateElementStyle(elementStyle.key, constructChange(stringValue));
    };

    return (
        <input
            type="text"
            className={`${inputWidth} p-[6px] text-xs px-2 rounded border-none text-text bg-bg text-start focus:outline-none focus:ring-0 appearance-none`}
            placeholder="--"
            value={localValue}
            onChange={handleInput}
            onFocus={onFocus}
            onBlur={onBlur}
            onKeyDown={handleKeyDown}
        />
    );
};

export default TextInput;
