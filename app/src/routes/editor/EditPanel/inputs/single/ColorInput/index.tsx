import { useEditorEngine } from '@/components/Context';
import { SingleStyle } from '@/lib/editor/styles/models';
import { Cross2Icon, PlusIcon } from '@radix-ui/react-icons';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { PopoverPicker } from './PopoverColorPicker';
import { Color } from '/common/color';

const isColorEmpty = (colorValue: string) => {
    const EMPTY_COLOR_VALUES = ['', 'initial', 'transparent', 'none', '#00000000'];
    return EMPTY_COLOR_VALUES.includes(colorValue);
};

const ColorInput = observer(
    ({
        elementStyle,
        onValueChange,
    }: {
        elementStyle: SingleStyle;
        onValueChange?: (key: string, value: string) => void;
    }) => {
        const editorEngine = useEditorEngine();
        const [value, setValue] = useState(Color.from(elementStyle.defaultValue).toHex());
        const [isOpen, toggleOpen] = useState(false);
        const [isFocused, setIsFocused] = useState(false);

        useEffect(() => {
            if (!editorEngine.style.selectedStyle || isFocused) {
                return;
            }
            const newValue = elementStyle.getValue(editorEngine.style.selectedStyle?.styles);
            const hexValue = Color.from(newValue)?.toHex();
            setValue(hexValue);
        }, [editorEngine.style.selectedStyle]);

        function sendStyleUpdate(newValue: Color) {
            const hexValue = newValue.toHex();
            setValue(hexValue);
            editorEngine.style.updateElementStyle(elementStyle.key, hexValue);
            onValueChange && onValueChange(elementStyle.key, hexValue);
        }

        function renderColorInput() {
            return (
                <PopoverPicker
                    isOpen={isOpen}
                    toggleOpen={toggleOpen}
                    color={Color.from(value)}
                    // TODO: draft value, preview it
                    onChange={(val) => setValue(val.toHex())}
                    onChangeEnd={sendStyleUpdate}
                />
            );
        }

        const handleFocus = () => {
            setIsFocused(true);
            editorEngine.history.startTransaction();
        };

        const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
            const formattedColor = Color.from(e.currentTarget.value);
            sendStyleUpdate(formattedColor);

            setIsFocused(false);
            editorEngine.history.commitTransaction();
        };

        function renderTextInput() {
            return (
                <input
                    className="w-16 text-xs border-none text-active bg-transparent text-start focus:outline-none focus:ring-0 "
                    type="text"
                    value={isColorEmpty(value) ? '' : value}
                    placeholder="None"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.currentTarget.blur();
                        }
                    }}
                    onChange={(e) => setValue(e.target.value)}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                />
            );
        }

        function handleColorButtonClick() {
            const newValue = isColorEmpty(value) ? Color.black : Color.transparent;
            sendStyleUpdate(newValue);
        }

        function renderControlButton() {
            return (
                <button className="text-foreground-onlook" onClick={handleColorButtonClick}>
                    {isColorEmpty(value) ? <PlusIcon /> : <Cross2Icon />}
                </button>
            );
        }

        return (
            <div className="w-32 p-[6px] gap-2 flex flex-row rounded cursor-pointer bg-background-onlook/75">
                {renderColorInput()}
                {renderTextInput()}
                {renderControlButton()}
            </div>
        );
    },
);

export default ColorInput;
