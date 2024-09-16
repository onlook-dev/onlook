import { formatColorInput, stringToHex } from '@/lib/editor/styles/colors';
import { constructChangeCurried } from '@/lib/editor/styles/inputs';
import { ElementStyle } from '@/lib/editor/styles/models';
import { useEditorEngine } from '@/routes/editor';
import { Cross2Icon, PlusIcon } from '@radix-ui/react-icons';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { PopoverPicker } from './PopoverColorPicker';

const ColorInput = observer(
    ({
        elementStyle,
        onValueChange,
    }: {
        elementStyle: ElementStyle;
        onValueChange?: (key: string, value: string) => void;
    }) => {
        const [inputString, setInputString] = useState(stringToHex(elementStyle.value));
        const [isOpen, toggleOpen] = useState(false);
        const editorEngine = useEditorEngine();
        const constructChange = constructChangeCurried(elementStyle.value);

        useEffect(() => {
            setInputString(stringToHex(elementStyle.value));
            toggleOpen(false);
        }, [elementStyle]);

        function isNoneInput() {
            return inputString === 'initial' || inputString === '';
        }

        function sendStyleUpdate(newValue: string) {
            setInputString(newValue);
            editorEngine.style.updateElementStyle(elementStyle.key, constructChange(newValue));
            onValueChange && onValueChange(elementStyle.key, newValue);
        }

        function renderColorInput() {
            return (
                <PopoverPicker
                    isOpen={isOpen}
                    toggleOpen={toggleOpen}
                    color={inputString}
                    onChange={sendStyleUpdate}
                />
            );
        }

        function renderTextInput() {
            return (
                <input
                    className="w-16 text-xs border-none text-active bg-transparent text-start focus:outline-none focus:ring-0 "
                    type="text"
                    value={isNoneInput() ? '' : inputString}
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
                />
            );
        }

        function renderControlButton() {
            return (
                <button
                    className="text-text"
                    onClick={() => {
                        const newValue = isNoneInput() ? '#000000' : '';
                        sendStyleUpdate(newValue);
                    }}
                >
                    {isNoneInput() ? <PlusIcon /> : <Cross2Icon />}
                </button>
            );
        }

        return (
            <div className="w-32 p-[6px] gap-2 flex flex-row rounded cursor-pointer bg-bg/75">
                {renderColorInput()}
                {renderTextInput()}
                {renderControlButton()}
            </div>
        );
    },
);

export default ColorInput;
