import { useEditorEngine } from '@/components/Context';
import type { SingleStyle } from '@/lib/editor/styles/models';
import { Icons } from '@onlook/ui/icons';
import { Color, isColorEmpty } from '@onlook/utility';
import { observer } from 'mobx-react-lite';
import { useEffect, useMemo, useState } from 'react';
import { PopoverPicker } from './PopoverColorPicker';

const ColorInput = observer(
    ({
        elementStyle,
        onValueChange,
    }: {
        elementStyle: SingleStyle;
        onValueChange?: (key: string, value: string) => void;
    }) => {
        const editorEngine = useEditorEngine();
        const [color, setColor] = useState(Color.from(elementStyle.defaultValue));
        const value = useMemo(() => color.toHex(), [color]);

        // Input
        const [isFocused, setIsFocused] = useState(false);
        const [stagingInputValue, setStagingInputValue] = useState(value);
        const [prevInputValue, setPrevInputValue] = useState(value);
        const inputValue = isFocused ? stagingInputValue : value;

        useEffect(() => {
            if (!editorEngine.style.selectedStyle || isFocused) {
                return;
            }
            const newValue = elementStyle.getValue(editorEngine.style.selectedStyle?.styles);
            setColor(Color.from(newValue));
        }, [editorEngine.style.selectedStyle]);

        function sendStyleUpdate(newValue: Color) {
            setColor(newValue);
            const valueString = newValue.toHex();
            editorEngine.style.updateElementStyle(elementStyle.key, valueString);
            onValueChange && onValueChange(elementStyle.key, valueString);
        }

        function renderColorInput() {
            return (
                <PopoverPicker
                    color={color}
                    onChange={sendStyleUpdate}
                    onChangeEnd={sendStyleUpdate}
                />
            );
        }

        const handleFocus = () => {
            setStagingInputValue(value);
            setPrevInputValue(value);
            setIsFocused(true);
            editorEngine.history.startTransaction();
        };

        const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
            if (prevInputValue !== e.currentTarget.value) {
                const formattedColor = Color.from(e.currentTarget.value);
                sendStyleUpdate(formattedColor);
            }

            setIsFocused(false);
            editorEngine.history.commitTransaction();
        };

        function renderTextInput() {
            return (
                <input
                    className="w-16 text-xs border-none text-active bg-transparent text-start focus:outline-none focus:ring-0 "
                    type="text"
                    value={isColorEmpty(inputValue) ? '' : inputValue}
                    placeholder="None"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.currentTarget.blur();
                        }
                    }}
                    onChange={(e) => setStagingInputValue(e.target.value)}
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
                    {isColorEmpty(value) ? <Icons.Plus /> : <Icons.CrossS />}
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
