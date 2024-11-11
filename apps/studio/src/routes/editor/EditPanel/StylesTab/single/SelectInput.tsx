import { useEditorEngine } from '@/components/Context';
import type { SingleStyle } from '@/lib/editor/styles/models';
import { ToggleGroup, ToggleGroupItem } from '@onlook/ui/toggle-group';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { Icons } from '@onlook/ui/icons';

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

const OVERRIDE_ICONS: Record<string, JSX.Element | string | Record<string, JSX.Element>> = {
    'flex-start': <Icons.ArrowRight />,
    'flex-end': <Icons.ArrowDown />,
    'space-between': <Icons.ArrowRight />,
    'space-around': <Icons.ArrowRight />,
    'space-evenly': <Icons.ArrowRight />,
    'flex-start flex-end': <Icons.ArrowRight />,
    'flex-start flex-start': <Icons.ArrowRight />,
    'flex-end flex-end': <Icons.ArrowRight />,
    start: <Icons.TextAlignLeft />,
    center: <Icons.TextAlignCenter />,
    end: <Icons.TextAlignRight />,
    solid: <Icons.BorderSolid />,
    dashed: <Icons.BorderDashed />,
    dotted: <Icons.BorderDotted />,
    row: <Icons.ArrowRight />,
    column: <Icons.ArrowDown />,
    block: '--',
    justifyContent: {
        'flex-start': <Icons.AlignLeft />,
        center: <Icons.AlignCenterHorizontally />,
        'flex-end': <Icons.AlignRight />,
        stretch: <Icons.SpaceBetweenHorizontally />,
    },
    alignItems: {
        'flex-start': <Icons.AlignTop />,
        center: <Icons.AlignCenterVertically />,
        'flex-end': <Icons.AlignBottom />,
        stretch: <Icons.SpaceBetweenVertically />,
    },
};

const ICON_SELECTION = ['justifyContent', 'alignItems'];

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

        if (!elementStyle.params?.options) {
            return null;
        }

        if (elementStyle.params.options.length <= 3 || ICON_SELECTION.includes(elementStyle.key)) {
            return (
                <ToggleGroup
                    className="w-32 overflow-hidden"
                    size="sm"
                    type="single"
                    value={value}
                    onValueChange={handleValueChange}
                >
                    {elementStyle.params?.options.map((option) => {
                        let optionIcon: any = option;
                        if (
                            OVERRIDE_ICONS[elementStyle.key] &&
                            typeof OVERRIDE_ICONS[elementStyle.key] === 'object'
                        ) {
                            optionIcon =
                                (OVERRIDE_ICONS[elementStyle.key] as Record<string, JSX.Element>)[
                                    option
                                ] ||
                                OVERRIDE_ICONS[option] ||
                                option;
                        } else {
                            optionIcon = OVERRIDE_ICONS[option] || option;
                        }

                        return (
                            <ToggleGroupItem
                                className="capitalize text-xs data-[state=on]:bg-background-onlook/75 data-[state=on]:text-foreground-active hover:text-foreground-hover"
                                value={option}
                                key={option}
                            >
                                {optionIcon}
                            </ToggleGroupItem>
                        );
                    })}
                </ToggleGroup>
            );
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
                    <Icons.ChevronDown />
                </div>
            </div>
        );
    },
);

export default SelectInput;
