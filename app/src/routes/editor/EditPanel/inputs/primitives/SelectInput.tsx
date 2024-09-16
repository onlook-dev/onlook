import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { constructChangeCurried } from '@/lib/editor/styles/inputs';
import { ElementStyle } from '@/lib/editor/styles/models';
import {
    ArrowDownIcon,
    ArrowRightIcon,
    BorderDashedIcon,
    BorderDottedIcon,
    BorderSolidIcon,
    ChevronDownIcon,
    TextAlignCenterIcon,
    TextAlignLeftIcon,
    TextAlignRightIcon,
} from '@radix-ui/react-icons';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { useEditorEngine } from '../../..';

const OVERRIDE_OPTIONS: Record<string, string> = {
    'flex-start': 'start',
    'flex-end': 'end',
    'space-between': 'stretch',
    'space-around': 'around',
    'space-evenly': 'evenly',
    'flex-start flex-end': 'between',
    'flex-start flex-start': 'around',
    'flex-end flex-end': 'evenly',
};

const OVERRIDE_ICONS: Record<string, any> = {
    'flex-start': <ArrowRightIcon />,
    'flex-end': <ArrowDownIcon />,
    'space-between': <ArrowRightIcon />,
    'space-around': <ArrowRightIcon />,
    'space-evenly': <ArrowRightIcon />,
    'flex-start flex-end': <ArrowRightIcon />,
    'flex-start flex-start': <ArrowRightIcon />,
    'flex-end flex-end': <ArrowRightIcon />,
    start: <TextAlignLeftIcon />,
    center: <TextAlignCenterIcon />,
    end: <TextAlignRightIcon />,
    solid: <BorderSolidIcon />,
    dashed: <BorderDashedIcon />,
    dotted: <BorderDottedIcon />,
    row: <ArrowRightIcon />,
    column: <ArrowDownIcon />,
    flex: 'Stack',
    block: '--',
};

const SelectInput = observer(
    ({
        elementStyle,
        onValueChange,
    }: {
        elementStyle: ElementStyle;
        onValueChange?: (key: string, value: string) => void;
    }) => {
        const editorEngine = useEditorEngine();
        const [selectedValue, setSelectedValue] = useState(elementStyle.value);
        const constructChange = constructChangeCurried(elementStyle.value);

        useEffect(() => {
            setSelectedValue(elementStyle.value);
        }, [elementStyle]);

        function handleValueChange(val: string) {
            if (!val) {
                return;
            }
            setSelectedValue(val);
            editorEngine.style.updateElementStyle(elementStyle.key, constructChange(val));
            onValueChange && onValueChange(elementStyle.key, val);
        }

        return (
            <div>
                {elementStyle &&
                    elementStyle.options &&
                    (elementStyle.options.length < 4 ? (
                        <ToggleGroup
                            className="w-32 overflow-hidden"
                            size="sm"
                            type="single"
                            value={selectedValue}
                            onValueChange={handleValueChange}
                        >
                            {elementStyle.options.map((option) => (
                                <ToggleGroupItem
                                    className="capitalize text-xs"
                                    value={option}
                                    key={option}
                                >
                                    {OVERRIDE_ICONS[option] ?? option}
                                </ToggleGroupItem>
                            ))}
                        </ToggleGroup>
                    ) : (
                        <div className="relative w-32">
                            <select
                                name={elementStyle.displayName}
                                value={selectedValue}
                                className="p-[6px] w-full px-2 text-start rounded border-none text-xs text-active bg-bg/75 appearance-none focus:outline-none focus:ring-0 capitalize"
                                onChange={(event) => handleValueChange(event.currentTarget.value)}
                            >
                                {!elementStyle.options.includes(selectedValue) && (
                                    <option value={selectedValue}>{selectedValue}</option>
                                )}
                                {elementStyle.options.map((option) => (
                                    <option value={option} key={option}>
                                        {OVERRIDE_OPTIONS[option] ?? option}
                                    </option>
                                ))}
                            </select>
                            <div className="text-text absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                                <ChevronDownIcon />
                            </div>
                        </div>
                    ))}
            </div>
        );
    },
);

export default SelectInput;
