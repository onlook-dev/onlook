import { formatColorInput, stringToHex } from '@/lib/editor/styles/colors';
import { ElementStyle } from '@/lib/editor/styles/models';
import { useEditorEngine } from '@/routes/project';
import { Cross2Icon, PlusIcon } from '@radix-ui/react-icons';
import { useEffect, useState } from 'react';
import { constructChangeCurried } from '../../InputsCommon';
import { PopoverPicker } from './PopoverColorPicker';

export default function ColorInput({
    elementStyle,
    onValueChange,
}: {
    elementStyle: ElementStyle;
    onValueChange?: (key: string, value: string) => void;
}) {
    const [inputString, setInputString] = useState(() => stringToHex(elementStyle.value));
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

    function renderColorInput() {
        return (
            <PopoverPicker
                isOpen={isOpen}
                toggleOpen={toggleOpen}
                color={inputString}
                onChange={(color: string) => {
                    editorEngine.style.updateElementStyle(elementStyle.key, constructChange(color));
                    setInputString(color);
                    onValueChange && onValueChange(elementStyle.key, color);
                }}
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
                    setInputString(formattedColor);
                    editorEngine.style.updateElementStyle(
                        elementStyle.key,
                        constructChange(formattedColor),
                    );
                    onValueChange && onValueChange(elementStyle.key, formattedColor);
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
                    setInputString(newValue);
                    editorEngine.style.updateElementStyle(
                        elementStyle.key,
                        constructChange(newValue),
                    );
                    onValueChange && onValueChange(elementStyle.key, newValue);
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
}
