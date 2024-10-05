import { useEditorEngine } from '@/components/Context';
import { SingleStyle } from '@/lib/editor/styles/models';
import { handleNumberInputKeyDown } from '@/lib/editor/styles/numberUnit';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { Change } from '/common/actions';

const TextInput = observer(
    ({
        elementStyle,
        onValueChange,
    }: {
        elementStyle: SingleStyle;
        onValueChange?: (key: string, value: string) => void;
    }) => {
        const editorEngine = useEditorEngine();
        const [originalValue, setOriginalValue] = useState(elementStyle.defaultValue);
        const [value, setValue] = useState(elementStyle.defaultValue);

        useEffect(() => {
            if (!editorEngine.style.selectedStyle) {
                return;
            }
            const newValue = elementStyle.getValue(editorEngine.style.selectedStyle?.styles);
            setValue(newValue);
            setOriginalValue(newValue);
        }, [editorEngine.style.selectedStyle]);

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

        const sendStyleUpdate = (newValue: string) => {
            setValue(newValue);
            const change: Change<string> = {
                original: originalValue,
                updated: newValue,
            };

            editorEngine.style.updateElementStyle(elementStyle.key, change);
            onValueChange && onValueChange(elementStyle.key, newValue);
        };

        const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
            const newValue = e.currentTarget.value;
            sendStyleUpdate(newValue);
        };

        return (
            <input
                type="text"
                className={`w-full p-[6px] text-xs px-2 rounded border-none text-active bg-bg/75 text-start focus:outline-none focus:ring-0 appearance-none`}
                placeholder="--"
                value={value}
                onChange={handleInput}
                onFocus={onFocus}
                onBlur={onBlur}
                onKeyDown={(e) => handleNumberInputKeyDown(e, value, setValue, sendStyleUpdate)}
            />
        );
    },
);

export default TextInput;
