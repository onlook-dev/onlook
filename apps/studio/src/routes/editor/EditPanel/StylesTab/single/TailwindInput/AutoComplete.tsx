import { cn } from '@onlook/ui/utils';
import { forwardRef, useImperativeHandle, useState } from 'react';
import { getContextualSuggestions, searchTailwindClasses } from '../TailwindClassGen';
import { bgColorClasses } from '../TailwindColorMapGen';

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

    // more autocomplete related functions
    const getColorPreviewClass = (suggestion: string) => {
        // Only handle bg- classes for now
        // TODO: Add more color class support
        const match = suggestion.match(
            /(bg)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)/,
        );
        if (!match) {
            return '';
        }

        // Create a mapping object for all possible combinations
        // Need to define all colors explicitly because Tailwind extracts class names
        // that it will only find classes that exist as complete unbroken strings
        // in your source files i.e. it doesn't render dynamically generated color classes
        // Ref.: https://tailwindcss.com/docs/content-configuration#dynamic-class-names
        const colorMap: Record<string, string> = bgColorClasses;
        return colorMap[suggestion] || '';
    };

    return (
        showSuggestions && (
            <div className="z-50 fixed top-50 left-50 w-[90%] mt-1 rounded text-foreground bg-background-onlook overflow-auto">
                {suggestions.map((suggestion, index) => {
                    const colorClass = getColorPreviewClass(suggestion);
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
                                        className={`w-4 h-4 mr-2 ${colorClass} border border-foreground-onlook`}
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
