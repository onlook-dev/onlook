import { useEditorEngine } from '@/components/Context';
import type { CompoundStyle, SingleStyle } from '@/lib/editor/styles/models';
import { invokeMainChannel } from '@/lib/utils';
import { MainChannels } from '@onlook/models/constants';
import { Icons } from '@onlook/ui/icons';
import { Color, isColorEmpty } from '@onlook/utility';
import { observer } from 'mobx-react-lite';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import PopoverPicker from './Popover';

const stripUrlWrapper = (url: string) => {
    return url.replace(/^url\((['"]?)(.*)\1\)/, '$2');
};

export const isBackgroundImageEmpty = (backgroundImage: string | undefined) => {
    if (!backgroundImage) {
        return true;
    }
    return backgroundImage === '' || backgroundImage === 'none';
};

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
        // Don't use isColorEmpty here as it might incorrectly identify valid colors as empty
        // If value is a valid hex color (including #000000 for black), show it
        const colorValue = inputValue || '';
        const displayValue =
            backgroundImage && !isBackgroundImageEmpty(backgroundImage)
                ? backgroundImage
                : colorValue;
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

            // For color styles specifically, we need to be careful
            if (elementStyle.key === 'color') {
                // Get the currently selected element
                const selectedEl = editorEngine.elements.selected[0];
                if (selectedEl) {
                    const tagName = selectedEl.tagName?.toLowerCase();

                    // Check if we have a heading or text element
                    const isTextElement =
                        tagName === 'p' ||
                        tagName?.match(/^h[1-6]$/) ||
                        tagName === 'span' ||
                        tagName === 'div';

                    // For text elements, prioritize the actual computed color from the DOM
                    if (isTextElement && selectedEl.styles?.computed) {
                        // If we have a computed color, use it
                        if (selectedEl.styles.computed.color) {
                            return Color.from(selectedEl.styles.computed.color);
                        }
                    }
                }
            }

            // Standard color handling for non-text elements or fallback
            const selectedStyles = editorEngine.style.selectedStyle?.styles;

            // For color, check the direct style value first
            if (elementStyle.key === 'color' && selectedStyles.color) {
                return Color.from(selectedStyles.color);
            }

            // Standard fallback behavior
            return Color.from(elementStyle.getValue(selectedStyles));
        }, [
            editorEngine.style.selectedStyle?.styles,
            elementStyle,
            isFocused,
            editorEngine.elements.selected,
        ]);

        // Update color state when getColor changes
        const [color, setColor] = useState(getColor);
        useEffect(() => {
            if (!isFocused) {
                setColor(getColor);
            }
        }, [getColor, isFocused]);

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
            const backgroundWrapped = backgroundImage.getValue(
                editorEngine.style.selectedStyle?.styles,
            );
            return stripUrlWrapper(backgroundWrapped);
        }, [compoundStyle, editorEngine.style.selectedStyle?.styles]);

        const backgroundImage = useMemo(() => getBackgroundImage(), [getBackgroundImage]);

        const handleColorButtonClick = useCallback(() => {
            if (!isBackgroundImageEmpty(backgroundImage)) {
                editorEngine.image.remove();
                return;
            }
            const newValue = isColorEmpty(value) ? Color.black : Color.transparent;
            sendStyleUpdate(newValue);
        }, [value, sendStyleUpdate, backgroundImage]);

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

        const renderButtonIcon = () => {
            if (!isBackgroundImageEmpty(backgroundImage)) {
                return <Icons.CrossS />;
            }
            if (isColorEmpty(value)) {
                return <Icons.Plus />;
            }
            return <Icons.CrossS />;
        };

        return (
            <div className="w-32 p-[6px] gap-2 flex flex-row rounded cursor-pointer bg-background-onlook/75">
                <PopoverPicker
                    color={color}
                    onChange={sendStyleUpdate}
                    onChangeEnd={sendStyleUpdate}
                    backgroundImage={backgroundImage}
                    compoundStyle={compoundStyle}
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
                <button className="text-foreground-onlook" onClick={handleColorButtonClick}>
                    {renderButtonIcon()}
                </button>
            </div>
        );
    },
);

ColorInput.displayName = 'ColorInput';
ColorTextInput.displayName = 'ColorTextInput';

export default memo(ColorInput);
