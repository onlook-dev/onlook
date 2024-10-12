import { useEditorEngine } from '@/components/Context';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { SingleStyle } from '@/lib/editor/styles/models';
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

const OVERRIDE_OPTIONS: Record<string, string | undefined> = {
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
        elementStyle: SingleStyle;
        onValueChange?: (key: string, value: string) => void;
    }) => {
        const editorEngine = useEditorEngine();
        const [value, setValue] = useState(elementStyle.defaultValue);

        useEffect(() => {
            if (!editorEngine.style.selectedStyle) {
                return;
            }
            const newValue = elementStyle.getValue(editorEngine.style.selectedStyle?.styles);
            setValue(newValue);
        }, [editorEngine.style.selectedStyle]);

        const handleValueChange = (newValue: string) => {
            if (!newValue) {
                return;
            }
            setValue(newValue);
            editorEngine.style.updateElementStyle(elementStyle.key, newValue);
            onValueChange && onValueChange(elementStyle.key, newValue);
        };

        function rendeUpToThreeOptions() {
            if (!elementStyle.params?.options || elementStyle.params.options.length > 3) {
                return null;
            }

            return (
                <ToggleGroup
                    className="w-32 overflow-hidden"
                    size="sm"
                    type="single"
                    value={value}
                    onValueChange={handleValueChange}
                >
                    {elementStyle.params?.options.map((option) => (
                        <ToggleGroupItem
                            className="capitalize text-xs data-[state=on]:bg-background-onlook/75 data-[state=on]:text-foreground-onlook"
                            value={option}
                            key={option}
                        >
                            {OVERRIDE_ICONS[option] ?? option}
                        </ToggleGroupItem>
                    ))}
                </ToggleGroup>
            );
        }

        function renderMoreThanThreeOptions() {
            if (!elementStyle.params?.options || elementStyle.params.options.length <= 3) {
                return null;
            }

            return (
                <div className="relative w-32">
                    <select
                        name={elementStyle.displayName}
                        value={value}
                        className="p-[6px] w-full px-2 text-start rounded border-none text-xs text-active bg-background-onlook/75 appearance-none focus:outline-none focus:ring-0 capitalize"
                        onChange={(event) => handleValueChange(event.currentTarget.value)}
                    >
                        {!elementStyle.params.options.includes(value) && (
                            <option value={value}>{value}</option>
                        )}
                        {elementStyle.params.options.map((option) => (
                            <option value={option} key={option}>
                                {OVERRIDE_OPTIONS[option] ?? option}
                            </option>
                        ))}
                    </select>
                    <div className="text-foreground-onlook absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                        <ChevronDownIcon />
                    </div>
                </div>
            );
        }

        return (
            <div>
                {rendeUpToThreeOptions()}
                {renderMoreThanThreeOptions()}
            </div>
        );
    },
);

export default SelectInput;
