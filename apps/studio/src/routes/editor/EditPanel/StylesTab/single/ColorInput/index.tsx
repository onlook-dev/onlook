import { useEditorEngine } from '@/components/Context';
import type { CompoundStyle, SingleStyle } from '@/lib/editor/styles/models';
import { invokeMainChannel } from '@/lib/utils';
import { MainChannels } from '@onlook/models/constants';
import { Icons } from '@onlook/ui/icons';
import { Color, isColorEmpty } from '@onlook/utility';
import { observer } from 'mobx-react-lite';
import { memo, useCallback, useMemo, useState } from 'react';
import PopoverPicker from './Popover';

const ColorTextInput = memo(
    ({
        value,
        isFocused,
        stagingInputValue,
        setStagingInputValue,
        onFocus,
        onBlur,
        backgroundImage,
    }: {
        value: string;
        isFocused: boolean;
        stagingInputValue: string;
        setStagingInputValue: (value: string) => void;
        onFocus: () => void;
        onBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
        backgroundImage?: string;
    }) => {
        const inputValue = isFocused ? stagingInputValue : value;
        const stripUrl = (url: string) => {
            return url.replace(/^url\((['"]?)(.*)\1\)/, '$2');
        };
        const displayValue = backgroundImage ? stripUrl(backgroundImage) : inputValue;
        const isUrl = backgroundImage && displayValue.startsWith('http');

        if (isFocused || !isUrl) {
            return (
                <input
                    className="w-16 text-xs border-none text-active bg-transparent text-start focus:outline-none focus:ring-0"
                    type="text"
                    value={displayValue}
                    placeholder="None"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.currentTarget.blur();
                        }
                    }}
                    onChange={(e) => setStagingInputValue(e.target.value)}
                    onFocus={onFocus}
                    onBlur={onBlur}
                />
            );
        }

        return (
            <p
                className="w-16 text-xs text-active hover:underline truncate flex items-center"
                onClick={(e) => {
                    e.stopPropagation();
                    invokeMainChannel(MainChannels.OPEN_EXTERNAL_WINDOW, displayValue);
                }}
            >
                {displayValue.split('/').pop()}
            </p>
        );
    },
);

const ControlButton = memo(({ value, onClick }: { value: string; onClick: () => void }) => (
    <button className="text-foreground-onlook" onClick={onClick}>
        {isColorEmpty(value) ? <Icons.Plus /> : <Icons.CrossS />}
    </button>
));

const ColorInput = observer(
    ({
        elementStyle,
        onValueChange,
        compoundStyle,
    }: {
        elementStyle: SingleStyle;
        onValueChange?: (key: string, value: string) => void;
        compoundStyle?: CompoundStyle;
    }) => {
        const editorEngine = useEditorEngine();
        const [isFocused, setIsFocused] = useState(false);
        // Memoize getColor to prevent unnecessary recalculations
        const getColor = useMemo(() => {
            if (!editorEngine.style.selectedStyle?.styles || isFocused) {
                return Color.from(elementStyle.defaultValue);
            }
            const newValue = elementStyle.getValue(editorEngine.style.selectedStyle?.styles);
            return Color.from(newValue);
        }, [editorEngine.style.selectedStyle?.styles, elementStyle, isFocused]);

        // Use memoized getColor
        const [color, setColor] = useState(() => getColor);
        const value = useMemo(() => color.toHex(), [color]);

        // Memoize handlers to prevent unnecessary re-renders
        const sendStyleUpdate = useCallback(
            (newValue: Color) => {
                setColor(newValue);
                const valueString = newValue.toHex();
                editorEngine.style.update(elementStyle.key, valueString);
                onValueChange?.(elementStyle.key, valueString);
            },
            [editorEngine.style, elementStyle.key, onValueChange],
        );

        const handleColorButtonClick = useCallback(() => {
            const newValue = isColorEmpty(value) ? Color.black : Color.transparent;
            sendStyleUpdate(newValue);
        }, [value, sendStyleUpdate]);

        const [stagingInputValue, setStagingInputValue] = useState(value);
        const [prevInputValue, setPrevInputValue] = useState(value);

        const getBackgroundImage = useCallback((): string | undefined => {
            if (!compoundStyle) {
                return undefined;
            }
            if (!editorEngine.style.selectedStyle?.styles) {
                return undefined;
            }
            const backgroundImage = compoundStyle.children.find(
                (child) => child.key === 'backgroundImage',
            );
            if (!backgroundImage) {
                return undefined;
            }
            return backgroundImage.getValue(editorEngine.style.selectedStyle?.styles);
        }, [compoundStyle, editorEngine.style.selectedStyle?.styles]);

        const backgroundImage = useMemo(() => getBackgroundImage(), [getBackgroundImage]);

        const handleFocus = useCallback(() => {
            setStagingInputValue(value);
            setPrevInputValue(value);
            setIsFocused(true);
            editorEngine.history.startTransaction();
        }, [value, editorEngine.history]);

        const handleBlur = useCallback(
            (e: React.FocusEvent<HTMLInputElement>) => {
                if (prevInputValue !== e.currentTarget.value) {
                    const formattedColor = Color.from(e.currentTarget.value);
                    sendStyleUpdate(formattedColor);
                }

                setIsFocused(false);
                editorEngine.history.commitTransaction();
            },
            [prevInputValue, sendStyleUpdate, editorEngine.history],
        );

        return (
            <div className="w-32 p-[6px] gap-2 flex flex-row rounded cursor-pointer bg-background-onlook/75">
                <PopoverPicker
                    color={color}
                    onChange={sendStyleUpdate}
                    onChangeEnd={sendStyleUpdate}
                    isCompound={!!compoundStyle}
                />
                <ColorTextInput
                    value={value}
                    isFocused={isFocused}
                    stagingInputValue={stagingInputValue}
                    setStagingInputValue={setStagingInputValue}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    backgroundImage={backgroundImage}
                />
                <ControlButton value={value} onClick={handleColorButtonClick} />
            </div>
        );
    },
);

ColorInput.displayName = 'ColorInput';
ColorTextInput.displayName = 'ColorTextInput';
ControlButton.displayName = 'ControlButton';

export default memo(ColorInput);
