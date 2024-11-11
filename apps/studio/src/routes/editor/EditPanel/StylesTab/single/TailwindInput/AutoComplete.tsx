import { cn } from '@onlook/ui/utils';
import { forwardRef, useImperativeHandle, useState } from 'react';
import { coreColors, getContextualSuggestions, searchTailwindClasses } from './twClassGen';

export interface SuggestionsListRef {
    handleInput: (value: string) => void;
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

    const handleInput = (value: string) => {
        setCurrentInput(value);
        // Suggestions
        const filtered = filterSuggestions(value);
        setSuggestions(filtered);
        setSelectedSuggestion(0);
        setShowSuggestions(filtered.length > 0);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedSuggestion((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedSuggestion((prev) => (prev > 0 ? prev - 1 : 0));
        } else if (e.key === 'Tab' || e.key === 'Enter') {
            e.preventDefault();
            if (suggestions[selectedSuggestion]) {
                const words = currentInput.split(' ');
                words[words.length - 1] = suggestions[selectedSuggestion];
                const newValue = words.join(' ');
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

    const filterSuggestions = (input: string) => {
        if (!input.trim()) {
            return [];
        }
        const lastWord = input.split(' ').pop() || '';

        // Get direct matches based on input
        const searchResults = searchTailwindClasses(lastWord);

        // Get contextual suggestions based on existing classes
        const currentClasses = input.split(' ').filter(Boolean);
        const contextualSuggestions = getContextualSuggestions(currentClasses);

        // Combine and deduplicate results
        return Array.from(new Set([...searchResults, ...contextualSuggestions])).slice(0, 10);
    };

    const handleClick = (suggestion: string) => {
        const words = currentInput.split(' ');
        words[words.length - 1] = suggestion;
        const newValue = words.join(' ');
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
        showSuggestions && (
            <div className="z-50 fixed top-50 left-50 w-[90%] mt-1 rounded text-foreground bg-background-onlook overflow-auto">
                {suggestions.map((suggestion, index) => {
                    const colorClass = getColorPreviewValue(suggestion);
                    return (
                        <div
                            key={suggestion}
                            className={cn(
                                'px-3 py-2 cursor-pointer hover:bg-background-hover hover:font-semibold',
                                index === selectedSuggestion &&
                                    'bg-background-active font-semibold',
                            )}
                            onClick={() => {
                                handleClick(suggestion);
                            }}
                        >
                            <span className="flex">
                                {colorClass && (
                                    <div
                                        className="w-4 h-4 mr-2 border-[0.5px] border-foreground-tertiary rounded-sm"
                                        style={{ backgroundColor: colorClass }}
                                    />
                                )}
                                {suggestion}
                            </span>
                        </div>
                    );
                })}
            </div>
        )
    );
});

SuggestionsList.displayName = 'SuggestionsList';