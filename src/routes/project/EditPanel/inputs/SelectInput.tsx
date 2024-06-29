import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ElementStyle } from '@/lib/editor/engine/styles/models';
import { ArrowDownIcon, ArrowRightIcon, ChevronDownIcon } from '@radix-ui/react-icons';
import { useState } from 'react';

const OVERRIDE_OPTION_MAP: Record<string, string> = {
    "flex-start": "start",
    "flex-end": "end",
    "space-between": "stretch",
    "space-around": "around",
    "space-evenly": "evenly",
    "flex-start flex-end": "between",
    "flex-start flex-start": "around",
    "flex-end flex-end": "evenly",
};

const OVERRIDE_ICON_MAP: Record<string, any> = {
    "flex-start": <ArrowRightIcon />,
    "flex-end": <ArrowDownIcon />,
    "space-between": <ArrowRightIcon />,
    "space-around": <ArrowRightIcon />,
    "space-evenly": <ArrowRightIcon />,
    "flex-start flex-end": <ArrowRightIcon />,
    "flex-start flex-start": <ArrowRightIcon />,
    "flex-end flex-end": <ArrowRightIcon />,
};

const SelectInput = ({ elementStyle, updateElementStyle }: { elementStyle: ElementStyle, updateElementStyle: any }) => {
    const [selectedValue, setSelectedValue] = useState(elementStyle.value);

    const handleValueChange = (val: any) => {
        if (!val) return;
        updateElementStyle(elementStyle.key, val);
        setSelectedValue(val);
    };

    return (
        <div>
            {elementStyle && elementStyle.options && (elementStyle.options.length < 4 ? (
                <ToggleGroup
                    className="w-32 overflow-hidden"
                    size="sm"
                    type="single"
                    value={selectedValue}
                    onValueChange={handleValueChange}
                >
                    {elementStyle.options.map((option) => (
                        <ToggleGroupItem className="capitalize text-xs" value={option} key={option}>
                            {OVERRIDE_ICON_MAP[option] ?? option}
                        </ToggleGroupItem>
                    ))}
                </ToggleGroup>
            ) : (
                <div className="relative w-32">
                    <select
                        name={elementStyle.displayName}
                        value={selectedValue}
                        className="p-[6px] w-full px-2 text-start rounded border-none text-xs text-text bg-surface appearance-none focus:outline-none focus:ring-0 capitalize"
                        onChange={(event) => handleValueChange(event.currentTarget.value)}
                    >
                        {!elementStyle.options.includes(selectedValue) && (
                            <option value={selectedValue}>{selectedValue}</option>
                        )}
                        {elementStyle.options.map((option) => (
                            <option value={option} key={option}>
                                {OVERRIDE_OPTION_MAP[option] ?? option}
                            </option>
                        ))}
                    </select>
                    <div className="text-tertiary absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                        <ChevronDownIcon />
                    </div>
                </div>
            ))}
        </div>
    );
};

export default SelectInput;
