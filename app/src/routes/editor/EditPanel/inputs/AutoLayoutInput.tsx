import { useEditorEngine } from '@/components/Context/Editor';
import {
    getAutolayoutStyles,
    getInputValues,
    LayoutMode,
    LayoutProperty,
} from '@/lib/editor/styles/autolayout';
import { constructChangeCurried } from '@/lib/editor/styles/inputs';
import { ElementStyle } from '@/lib/editor/styles/models';
import { parsedValueToString, stringToParsedValue } from '@/lib/editor/styles/numberUnit';
import { appendCssUnit } from '@/lib/editor/styles/units';
import { ChevronDownIcon } from '@radix-ui/react-icons';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';

const OPTION_OVERRIDES: Record<string, string> = {
    Fit: 'Hug',
    Relative: 'Rel',
};

const AutoLayoutInput = observer(({ elementStyle }: { elementStyle: ElementStyle }) => {
    const [value, setValue] = useState(elementStyle.value);
    const [mode, setMode] = useState(LayoutMode.Fixed);
    const editorEngine = useEditorEngine();
    const constructChange = constructChangeCurried(elementStyle.value);

    useEffect(() => {
        if (elementStyle) {
            const res = getInputValues(elementStyle.value);
            setValue(res.value);
            setMode(res.mode);
        }
    }, [elementStyle]);

    const handleKeydown = (e: any) => {
        if (e.key === 'Enter') {
            e.currentTarget.blur();
            return;
        }

        let step = 1;
        if (e.shiftKey) {
            step = 10;
        }

        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            if (mode === LayoutMode.Fit) {
                return;
            }
            let [parsedNumber, parsedUnit] = stringToParsedValue(value);
            parsedNumber += e.key === 'ArrowUp' ? step : -step;

            const newValue = parsedValueToString(parsedNumber, parsedUnit);
            const res = getInputValues(newValue);
            setValue(res.value);
            setMode(res.mode);
            editorEngine.style.updateElementStyle(elementStyle.key, constructChange(newValue));
        }
    };

    const handleInputChange = (e: any) => {
        const res = getInputValues(e.target.value);
        setValue(res.value);
        setMode(res.mode);
        editorEngine.style.updateElementStyle(
            elementStyle.key,
            constructChange(appendCssUnit(res.value)),
        );
    };

    const handleSelectChange = (e: any) => {
        const res = getAutolayoutStyles(
            LayoutProperty[elementStyle.key as keyof typeof LayoutProperty],
            LayoutMode[e.target.value as keyof typeof LayoutMode],
            value,
            editorEngine.style.childRect,
            editorEngine.style.parentRect,
        );
        setMode(LayoutMode[e.target.value as keyof typeof LayoutMode]);
        setValue(res[elementStyle.key]);
        editorEngine.style.updateElementStyle(
            elementStyle.key,
            constructChange(res[elementStyle.key]),
        );
    };

    return (
        elementStyle && (
            <div className="flex flex-row gap-1 justify-end">
                <input
                    value={value === 'fit-content' ? '' : value}
                    type="text"
                    className={`w-16 rounded p-1 px-2 text-xs border-none text-active bg-bg/75 text-start focus:outline-none focus:ring-0`}
                    placeholder="--"
                    onChange={handleInputChange}
                    onBlur={() => setValue(appendCssUnit(value))}
                    onKeyDown={handleKeydown}
                />
                <div className="relative w-16">
                    <select
                        name={elementStyle.displayName}
                        value={mode}
                        className="p-[6px] w-full px-2 text-start rounded border-none text-xs text-active bg-bg/75 appearance-none focus:outline-none focus:ring-0 capitalize"
                        onChange={handleSelectChange}
                    >
                        {elementStyle.units?.map((option) => (
                            <option key={option} className="bg-bg/75" value={option}>
                                {OPTION_OVERRIDES[option] || option}
                            </option>
                        ))}
                    </select>
                    <div className="text-text absolute inset-y-0 right-0 flex items-center pr-1 pointer-events-none">
                        <ChevronDownIcon />
                    </div>
                </div>
            </div>
        )
    );
});

export default AutoLayoutInput;
