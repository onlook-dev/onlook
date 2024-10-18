import { useEditorEngine } from '@/components/Context';
import { formatColorInput, isColorEmpty, stringToHex } from '@/lib/editor/styles/colors';
import { SingleStyle } from '@/lib/editor/styles/models';
import { Cross2Icon, PlusIcon } from '@radix-ui/react-icons';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
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
        const [value, setValue] = useState(elementStyle.defaultValue);
        const [isOpen, toggleOpen] = useState(false);
        const [isFocused, setIsFocused] = useState(false);

        useEffect(() => {
            if (!editorEngine.style.selectedStyle || isFocused) {
                return;
            }
            const newValue = elementStyle.getValue(editorEngine.style.selectedStyle?.styles);
            const hexValue = stringToHex(newValue);
            setValue(hexValue);
        }, [editorEngine.style.selectedStyle]);

        function sendStyleUpdate(newValue: string) {
            setValue(newValue);
            editorEngine.style.updateElementStyle(elementStyle.key, newValue);
            onValueChange && onValueChange(elementStyle.key, newValue);
        }

        function ColorInput() {
            return (
                <PopoverPicker
                    isOpen={isOpen}
                    toggleOpen={toggleOpen}
                    color={value}
                    onChange={sendStyleUpdate}
                />
            );
        }

        const handleFocus = () => {
            setIsFocused(true);
            editorEngine.history.startTransaction();
        };

        const handleBlur = () => {
            setIsFocused(false);
            editorEngine.history.commitTransaction();
        };

        function TextInput() {
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
                    onChange={(event) => {
                        const formattedColor = formatColorInput(event.target.value);
                        sendStyleUpdate(formattedColor);
                    }}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                />
            );
        }

        function handleColorButtonClick() {
            const newValue = isColorEmpty(value) ? '#000000' : 'transparent';
            sendStyleUpdate(newValue);
        }

        function ControlButton() {
            return (
                <button className="text-foreground-onlook" onClick={handleColorButtonClick}>
                    {isColorEmpty(value) ? <PlusIcon /> : <Cross2Icon />}
                </button>
            );
        }

        return (
            <div className="w-32 p-[6px] gap-2 flex flex-row rounded cursor-pointer bg-background-onlook/75">
                <ColorInput />
                <TextInput />
                <ControlButton />
            </div>
        );
    },
);

export default ColorInput;
