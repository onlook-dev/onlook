import { generateRowColumnTemplate, getRowColumnCount } from '@/lib/editor/styles/autolayout';
import { ElementStyle } from '@/lib/editor/styles/models';
import { parsedValueToString, stringToParsedValue } from '@/lib/editor/styles/numberUnit';
import { useEffect, useState } from 'react';
import { useEditorEngine } from '../..';
import { constructChangeCurried } from './InputsCommon';

function RowColInput({ elementStyle }: { elementStyle: ElementStyle }) {
    const editorEngine = useEditorEngine();
    const [value, setValue] = useState('');

    const constructChange = constructChangeCurried(value);

    useEffect(() => {
        setValue(getRowColumnCount(elementStyle.value).toString());
    }, [elementStyle.value]);

    const handleInput = (event: any) => {
        const updatedValue = generateRowColumnTemplate(event.target.value);
        editorEngine.style.updateElementStyle(elementStyle.key, constructChange(updatedValue));
    };

    const handleKeyDown = (event: any) => {
        let step = 1;
        if (event.key === 'Enter') {
            event.target.blur();
            return;
        }
        if (event.shiftKey) {
            step = 10;
        }

        let [parsedNumber, parsedUnit] = stringToParsedValue(event.target.value);

        if (event.key === 'ArrowUp') {
            parsedNumber += step;
            event.preventDefault();
        } else if (event.key === 'ArrowDown') {
            parsedNumber -= step;
            event.preventDefault();
        }

        const stringValue = parsedValueToString(parsedNumber, parsedUnit);
        setValue(stringValue);
        editorEngine.style.updateElementStyle(elementStyle.key, constructChange(stringValue));
    };

    return (
        <input
            type="text"
            className={`w-full p-[6px] text-xs px-2 rounded border-none text-active bg-bg/75 text-start focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
            placeholder="--"
            value={value}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
        />
    );
}

export default RowColInput;
