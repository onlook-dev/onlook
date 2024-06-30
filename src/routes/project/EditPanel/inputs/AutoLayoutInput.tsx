import { LayoutMode, getInputValues } from '@/lib/editor/engine/styles/autolayout';
import { ElementStyle } from '@/lib/editor/engine/styles/models';
import { appendCssUnit } from '@/lib/editor/engine/styles/units';
import { ChevronDownIcon } from '@radix-ui/react-icons';
import { useEffect, useState } from 'react';

interface Props {
    elementStyle: ElementStyle;
    updateElementStyle: (key: string, value: string) => void;
    inputWidth?: string;
}


const OPTION_OVERRIDES: Record<string, string> = {
    Fit: "Hug",
    Relative: "Rel",
};

function AutoLayoutInput({ elementStyle, updateElementStyle, inputWidth = "w-16" }: Props) {

    const [value, setValue] = useState(elementStyle.value);
    const [mode, setMode] = useState(LayoutMode.Fixed);

    useEffect(() => {
        if (elementStyle) {
            const res = getInputValues(elementStyle.value);
            setValue(res.value);
            setMode(res.mode);
        }
    }, [elementStyle]);

    const handleInputChange = (e: any) => {
        const res = getInputValues(e.target.value);
        setValue(res.value);
        setMode(res.mode);
        updateElementStyle(elementStyle.key, appendCssUnit(res.value));
    };

    const handleSelectChange = (e: any) => {
        // const res = getStyles(
        //     LayoutProperty[elementStyle.key],
        //     LayoutMode[e.target.value],
        //     value,
        //     el,
        // );
        // setMode(LayoutMode[e.target.value]);
        // setValue(res[elementStyle.key]);
        // updateElementStyle(elementStyle.key, res[elementStyle.key]);
    };

    return elementStyle && (
        <div className="flex flex-row gap-1 justify-end">
            <input
                value={value === "fit-content" ? "" : value}
                type="text"
                className={`${inputWidth} rounded-sm p-1 px-2 text-xs border-none text-text bg-surface text-start focus:outline-none focus:ring-0`}
                placeholder="--"
                onChange={handleInputChange}
                onBlur={() => setValue(appendCssUnit(value))}
            />
            <div className="relative w-16">
                <select
                    name={elementStyle.displayName}
                    value={mode}
                    className="p-[6px] w-full px-2 text-start rounded border-none text-xs text-text bg-surface appearance-none focus:outline-none focus:ring-0 capitalize"
                    onChange={handleSelectChange}
                >
                    {elementStyle.units?.map((option) => (
                        <option key={option} className="bg-red" value={option}>
                            {OPTION_OVERRIDES[option] || option}
                        </option>
                    ))}
                </select>
                <div className="text-tertiary absolute inset-y-0 right-0 flex items-center pr-1 pointer-events-none">
                    <ChevronDownIcon />
                </div>
            </div>
        </div>
    );
}

export default AutoLayoutInput;