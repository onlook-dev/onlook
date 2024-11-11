import { cn } from '@onlook/ui/utils';
import { forwardRef, useImperativeHandle, useState } from 'react';
import { coreColors, getContextualSuggestions, searchTailwindClasses } from './twClassGen';

export interface SuggestionsListRef {
    handleInput: (value: string, cursorPosition: number) => void;
    handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

export const SuggestionsList = forwardRef<
    SuggestionsListRef,
    {
        setClasses: React.Dispatch<React.SetStateAction<string>>;
        showSuggestions: boolean;
        setShowSuggestions: React.Dispatch<React.SetStateAction<boolean>>;
        currentInput: string;
        setCurrentInput: React.Dispatch<React.SetStateAction<string>>;
    }
>(({ setClasses, showSuggestions, setShowSuggestions, currentInput, setCurrentInput }, ref) => {
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [selectedSuggestion, setSelectedSuggestion] = useState(0);
    const [currentWordInfo, setCurrentWordInfo] = useState<{
        word: string;
        startIndex: number;
        endIndex: number;
    } | null>(null);

    const getWordAtCursor = (value: string, cursorPosition: number) => {
        // Find the start of the current word
        let startIndex = cursorPosition;
        while (startIndex > 0 && value[startIndex - 1] !== ' ') {
            startIndex--;
        }

        // Find the end of the current word
        let endIndex = cursorPosition;
        while (endIndex < value.length && value[endIndex] !== ' ') {
            endIndex++;
        }

        return {
            word: value.slice(startIndex, endIndex),
            startIndex,
            endIndex,
        };
    };

    const parseModifiers = (input: string): { modifiers: string[]; baseClass: string } => {
        const parts = input.split(':');
        const baseClass = parts.pop() || '';
        const modifiers = parts;
        return { modifiers, baseClass };
    };

    const reconstructWithModifiers = (modifiers: string[], newBaseClass: string): string => {
        return [...modifiers, newBaseClass].join(':');
    };

    const handleInput = (value: string, cursorPosition: number) => {
        setCurrentInput(value);
        const wordInfo = getWordAtCursor(value, cursorPosition);
        setCurrentWordInfo(wordInfo);

        const filtered = filterSuggestions(value, wordInfo);
        setSuggestions(filtered);
        setSelectedSuggestion(0);
        setShowSuggestions(filtered.length > 0);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (!currentWordInfo) {
            return;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedSuggestion((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedSuggestion((prev) => (prev > 0 ? prev - 1 : 0));
        } else if (e.key === 'Tab' || e.key === 'Enter') {
            e.preventDefault();
            if (suggestions[selectedSuggestion]) {
                const { modifiers } = parseModifiers(currentWordInfo.word);
                const newClass = reconstructWithModifiers(
                    modifiers,
                    suggestions[selectedSuggestion],
                );

                // Replace only the current word at cursor position
                const newValue =
                    currentInput.slice(0, currentWordInfo.startIndex) +
                    newClass +
                    currentInput.slice(currentWordInfo.endIndex);

                setClasses(newValue);
                setShowSuggestions(false);
            }
        } else if (e.key === 'Escape') {
            setShowSuggestions(false);
            e.currentTarget.blur();
        }
    };

    useImperativeHandle(ref, () => ({
        handleInput,
        handleKeyDown,
    }));

    const filterSuggestions = (
        input: string,
        wordInfo: { word: string; startIndex: number; endIndex: number },
    ) => {
        if (!wordInfo.word.trim()) {
            return [];
        }

        const { baseClass } = parseModifiers(wordInfo.word);

        // Get direct matches based on base class
        const searchResults = searchTailwindClasses(baseClass);

        // Get contextual suggestions based on existing classes
        const currentClasses = input
            .split(' ')
            .filter(Boolean)
            .map((cls) => {
                const { baseClass } = parseModifiers(cls);
                return baseClass;
            });
        const contextualSuggestions = getContextualSuggestions(currentClasses);

        // Combine and deduplicate results
        const combinedResults = Array.from(new Set([...searchResults, ...contextualSuggestions]));

        return combinedResults.slice(0, 10);
    };

    const handleClick = (suggestion: string) => {
        if (!currentWordInfo) {
            return;
        }

        const { modifiers } = parseModifiers(currentWordInfo.word);
        const newClass = reconstructWithModifiers(modifiers, suggestion);

        // Replace only the current word at cursor position
        const newValue =
            currentInput.slice(0, currentWordInfo.startIndex) +
            newClass +
            currentInput.slice(currentWordInfo.endIndex);

        setClasses(newValue);
        setShowSuggestions(false);
    };

    const getColorPreviewValue = (suggestion: string): string => {
        const colorPattern = coreColors.join('|');
        const headPattern =
            'bg|text|border|ring|shadow|divide|placeholder|accent|caret|fill|stroke';
        const shadePattern = '\\d+';
        const regex = new RegExp(`(${headPattern})-(${colorPattern})-(${shadePattern})`);
        const match = suggestion.match(regex);
        if (!match) {
            return '';
        }

        try {
            const [, , colorName, shade = '500'] = match;
            return `var(--color-${colorName}-${shade})`;
        } catch (error) {
            console.error('Error computing color:', error);
        }

        return '';
    };

    return (
        showSuggestions &&
        currentWordInfo && (
            <div className="z-50 fixed top-50 left-50 w-[90%] mt-1 rounded text-foreground bg-background-onlook overflow-auto">
                {suggestions.map((suggestion, index) => {
                    const colorClass = getColorPreviewValue(suggestion);
                    const { modifiers } = parseModifiers(currentWordInfo.word);

                    return (
                        <div
                            key={suggestion}
                            className={cn(
                                'px-3 py-2 cursor-pointer hover:bg-background-hover hover:font-semibold',
                                index === selectedSuggestion &&
                                    'bg-background-active font-semibold',
                            )}
                            onMouseDown={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                handleClick(suggestion);
                            }}
                        >
                            <span className="flex items-center">
                                {colorClass && (
                                    <div
                                        className="w-4 h-4 mr-2 border-[0.5px] border-foreground-tertiary rounded-sm"
                                        style={{ backgroundColor: colorClass }}
                                    />
                                )}
                                <span className="opacity-50 mr-1">
                                    {modifiers.length > 0 ? `${modifiers.join(':')}:` : ''}
                                </span>
                                <span>{suggestion}</span>
                            </span>
                        </div>
                    );
                })}
            </div>
        )
    );
});

SuggestionsList.displayName = 'SuggestionsList';
