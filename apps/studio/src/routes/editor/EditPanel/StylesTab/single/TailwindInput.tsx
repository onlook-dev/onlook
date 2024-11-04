import { useEditorEngine } from '@/components/Context';
import { Textarea } from '@onlook/ui/textarea';
import { sendAnalytics } from '@/lib/utils';
import { observer } from 'mobx-react-lite';
import { useEffect, useRef, useState } from 'react';
import { MainChannels } from '@onlook/models/constants';
import type { CodeDiffRequest } from '@onlook/models/code';
import type { TemplateNode } from '@onlook/models/element';
import { Icons } from '@onlook/ui/icons';

// Imports for Autocomplete
import { searchTailwindClasses, getContextualSuggestions } from './TailwindClassGen';
import { bgColorClasses } from './TailwindColorMapGen';

const TailwindInput = observer(() => {
    const editorEngine = useEditorEngine();

    const instanceRef = useRef<HTMLTextAreaElement>(null);
    const [instance, setInstance] = useState<TemplateNode | undefined>();
    const [instanceClasses, setInstanceClasses] = useState<string>('');
    const [isInstanceFocused, setIsInstanceFocused] = useState(false);

    const rootRef = useRef<HTMLTextAreaElement>(null);
    const [root, setRoot] = useState<TemplateNode | undefined>();
    const [rootClasses, setRootClasses] = useState<string>('');
    const [isRootFocused, setIsRootFocused] = useState(false);

    // New states & functions for autocomplete
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [selectedSuggestion, setSelectedSuggestion] = useState(0);
    const [currentInput, setCurrentInput] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);

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

    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>, isRoot: boolean) => {
        const value = e.target.value;
        if (isRoot) {
            setRootClasses(value);
        } else {
            setInstanceClasses(value);
        }
        setCurrentInput(value);
        const filtered = filterSuggestions(value);
        setSuggestions(filtered);
        setSelectedSuggestion(0);
        setShowSuggestions(filtered.length > 0);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, isRoot: boolean) => {
        if (showSuggestions) {
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
                    if (isRoot) {
                        setRootClasses(newValue);
                    } else {
                        setInstanceClasses(newValue);
                    }
                    setShowSuggestions(false);
                }
            } else if (e.key === 'Escape') {
                setShowSuggestions(false);
                e.target.blur();
            }
        } else if (e.key === 'Enter' || e.key === 'Tab' || e.key === 'Escape') {
            e.target.blur();
            e.preventDefault();
        }
    };

    const handleClick = (suggestion: string) => {
        const words = currentInput.split(' ');
        words[words.length - 1] = suggestion;
        const newValue = words.join(' ');
        setRootClasses(newValue);
        setInstanceClasses(newValue);
        setShowSuggestions(false);
    };
    //////////////////////////////////////////////////////////

    useEffect(() => {
        if (editorEngine.elements.selected.length) {
            const selectedEl = editorEngine.elements.selected[0];
            getInstanceClasses(selectedEl.selector);
            getRootClasses(selectedEl.selector);
        }
    }, [editorEngine.elements.selected]);

    async function getInstanceClasses(selector: string) {
        const instance = editorEngine.ast.getInstance(selector);
        setInstance(instance);
        if (instance) {
            const instanceClasses: string[] = await window.api.invoke(
                MainChannels.GET_TEMPLATE_NODE_CLASS,
                instance,
            );
            setInstanceClasses(instanceClasses.join(' '));
        }
    }

    async function getRootClasses(selector: string) {
        const root = editorEngine.ast.getRoot(selector);
        setRoot(root);
        if (root) {
            const rootClasses: string[] = await window.api.invoke(
                MainChannels.GET_TEMPLATE_NODE_CLASS,
                root,
            );
            setRootClasses(rootClasses.join(' '));
        }
    }

    const createCodeDiffRequest = async (templateNode: TemplateNode, className: string) => {
        const request: CodeDiffRequest = {
            templateNode,
            selector: editorEngine.elements.selected[0].selector,
            attributes: { className },
            insertedElements: [],
            movedElements: [],
            removedElements: [],
            groupElements: [],
            ungroupElements: [],
            overrideClasses: true,
        };
        const res = await editorEngine.code.getAndWriteCodeDiff([request]);
        if (res) {
            sendAnalytics('tailwind action');
        }
    };

    const adjustHeight = (textarea: HTMLTextAreaElement) => {
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight + 20}px`;
    };

    useEffect(() => {
        if (instanceRef.current) {
            adjustHeight(instanceRef.current);
        }
    }, [instanceClasses]);

    useEffect(() => {
        if (rootRef.current) {
            adjustHeight(rootRef.current);
        }
    }, [rootClasses]);

    const EnterIndicator = () => {
        return (
            <div className="absolute bottom-1 right-2 text-xs text-gray-500 flex items-center">
                <span>enter to apply</span>
                <Icons.Reset className="ml-1" />
            </div>
        );
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

    const SuggestionsList = ({ suggestions }: { suggestions: string[] }) => (
        <div className="fixed top-50 left-50 w-[90%] mt-1 rounded-sm shadow-sm shadow-foreground text-foreground bg-background-onlook overflow-hidden">
            {suggestions.map((suggestion, index) => {
                const colorClass = getColorPreviewClass(suggestion);
                return (
                    <div
                        key={suggestion}
                        className={`px-3 py-2 cursor-pointer ${
                            index === selectedSuggestion
                                ? 'bg-foreground-hover text-background-onlook'
                                : ''
                        } hover:bg-foreground-hover hover:text-background-onlook`}
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
    );
    //////////////////////////////////////////////////////////

    return (
        <div className="flex flex-col gap-2 text-xs text-foreground-onlook">
            {instance && <p>Instance</p>}
            {instance && (
                <div className="relative">
                    <div>
                        <Textarea
                            ref={instanceRef}
                            className="w-full text-xs text-foreground-active break-normal bg-background-onlook/75 focus-visible:ring-0"
                            placeholder="Add tailwind classes here"
                            value={instanceClasses}
                            // onInput={(e: any) => setInstanceClasses(e.target.value)}
                            onInput={(e: any) => handleInput(e, false)}
                            onKeyDown={(e: any) => handleKeyDown(e, true)}
                            onBlur={(e) => {
                                setShowSuggestions(false);
                                setIsInstanceFocused(false);
                                instance && createCodeDiffRequest(instance, e.target.value);
                            }}
                            onFocus={() => setIsInstanceFocused(true)}
                        />
                        {showSuggestions && isInstanceFocused && (
                            <SuggestionsList suggestions={suggestions} />
                        )}
                    </div>
                    {isInstanceFocused && <EnterIndicator />}
                </div>
            )}

            {instance && root && <p>Component</p>}
            {root && (
                <div className="relative">
                    <div>
                        <Textarea
                            ref={rootRef}
                            className="w-full text-xs text-foreground-active break-normal bg-background-onlook/75 focus-visible:ring-0 resize-none"
                            placeholder="Add tailwind classes here"
                            value={rootClasses}
                            // onInput={(e: any) => setRootClasses(e.target.value)}
                            onInput={(e: any) => handleInput(e, true)}
                            // onKeyDown={handleKeyDown}
                            onKeyDown={(e: any) => handleKeyDown(e, true)}
                            onBlur={(e) => {
                                setShowSuggestions(false);
                                setIsRootFocused(false);
                                root && createCodeDiffRequest(root, e.target.value);
                            }}
                            onFocus={() => setIsRootFocused(true)}
                        />
                        {showSuggestions && isRootFocused && (
                            <SuggestionsList suggestions={suggestions} />
                        )}
                    </div>
                    {isRootFocused && <EnterIndicator />}
                </div>
            )}
        </div>
    );
});

export default TailwindInput;
