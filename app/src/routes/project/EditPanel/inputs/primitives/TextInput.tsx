import { constructChangeCurried } from '@/lib/editor/styles/inputs';
import { ElementStyle } from '@/lib/editor/styles/models';
import { parsedValueToString, stringToParsedValue } from '@/lib/editor/styles/numberUnit';
import { appendCssUnit } from '@/lib/editor/styles/units';
import { useEditorEngine } from '@/routes/project';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';

const TextInput = observer(
    ({
        elementStyle,
        onValueChange,
    }: {
        elementStyle: ElementStyle;
        onValueChange?: (key: string, value: string) => void;
    }) => {
        const [localValue, setLocalValue] = useState(elementStyle.value);
        const editorEngine = useEditorEngine();

        const constructChange = constructChangeCurried(elementStyle.value);

        useEffect(() => {
            setLocalValue(elementStyle.value);
        }, [elementStyle]);

        function shouldSetTransaction() {
            const key = elementStyle.key.toLowerCase();
            return !(
                key === 'width' ||
                key === 'height' ||
                key.includes('padding') ||
                key.includes('margin')
            );
        }

        const onFocus = () => {
            if (shouldSetTransaction()) {
                editorEngine.history.startTransaction();
            }
        };

        const onBlur = () => {
            if (shouldSetTransaction()) {
                editorEngine.history.commitTransaction();
            }
        };

        const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
            const newValue = e.currentTarget.value;
            setLocalValue(newValue);
            editorEngine.style.updateElementStyle(
                elementStyle.key,
                constructChange(appendCssUnit(newValue)),
            );
            onValueChange && onValueChange(elementStyle.key, newValue);
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
            editorEngine.style.updateElementStyle(elementStyle.key, constructChange(stringValue));
            onValueChange && onValueChange(elementStyle.key, stringValue);
        };

        return (
            <input
                type="text"
                className={`w-full p-[6px] text-xs px-2 rounded border-none text-active bg-bg/75 text-start focus:outline-none focus:ring-0 appearance-none`}
                placeholder="--"
                value={localValue}
                onChange={handleInput}
                onFocus={onFocus}
                onBlur={onBlur}
                onKeyDown={handleKeyDown}
            />
        );
    },
);

export default TextInput;
