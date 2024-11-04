import { useEditorEngine } from '@/components/Context';
import { Textarea } from '@onlook/ui/textarea';
import { sendAnalytics } from '@/lib/utils';
import { observer } from 'mobx-react-lite';
import { useEffect, useRef, useState } from 'react';
import { MainChannels } from '@onlook/models/constants';
import type { CodeDiffRequest } from '@onlook/models/code';
import type { TemplateNode } from '@onlook/models/element';
import { Icons } from '@onlook/ui/icons';

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

    // New state for autocomplete
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [selectedSuggestion, setSelectedSuggestion] = useState(0);
    const [currentInput, setCurrentInput] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Common Tailwind classes for demonstration - you can expand this list
    const commonClasses = [
        'flex',
        'items-center',
        'justify-center',
        'p-4',
        'px-4',
        'py-2',
        'bg-blue-500',
        'text-white',
        'rounded',
        'hover:bg-blue-600',
        'grid',
        'grid-cols-2',
        'gap-4',
        'mx-auto',
        'my-4',
        'text-sm',
        'font-bold',
        'w-full',
        'h-full',
        'relative',
    ];

    const filterSuggestions = (input: string) => {
        if (!input.trim()) {
            return [];
        }
        const lastWord = input.split(' ').pop() || '';
        return commonClasses
            .filter((cls) => cls.toLowerCase().startsWith(lastWord.toLowerCase()))
            .slice(0, 5);
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

    // function handleKeyDown(e: any) {
    //     if (e.key === 'Enter' || e.key === 'Tab' || e.key === 'Escape') {
    //         e.target.blur();
    //         e.preventDefault();
    //     }
    // }

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

    ////////////////////////
    const SuggestionsList = ({ suggestions }: { suggestions: string[] }) => (
        <div className="fixed top-50 left-50 w-full mt-1 bg-white border rounded-md shadow-lg">
            {suggestions.map((suggestion, index) => (
                <div
                    key={suggestion}
                    className={`px-3 py-2 cursor-pointer ${
                        index === selectedSuggestion ? 'bg-blue-100' : ''
                    } hover:bg-blue-50`}
                    onClick={() => {
                        const words = currentInput.split(' ');
                        words[words.length - 1] = suggestion;
                        const newValue = words.join(' ');
                        setInstanceClasses(newValue);
                        setShowSuggestions(false);
                    }}
                >
                    {suggestion}
                </div>
            ))}
        </div>
    );
    ////////////////////////

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
                            onKeyDown={handleKeyDown}
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
