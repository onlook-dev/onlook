import { useEditorEngine } from '@/components/Context';
import { invokeMainChannel, sendAnalytics } from '@/lib/utils';
import type { CodeDiffRequest } from '@onlook/models/code';
import { MainChannels } from '@onlook/models/constants';
import type { TemplateNode } from '@onlook/models/element';
import { Icons } from '@onlook/ui/icons';
import { Textarea } from '@onlook/ui/textarea';
import { observer } from 'mobx-react-lite';
import { useEffect, useRef, useState } from 'react';
import { AutoComplete, type SuggestionsListRef } from './AutoComplete';

interface History {
    past: string[];
    present: string;
    future: string[];
}

const TailwindInput = observer(() => {
    const editorEngine = useEditorEngine();
    const suggestionRef = useRef<SuggestionsListRef>(null);
    const [showSuggestions, setShowSuggestions] = useState(true);
    const [currentSelector, setSelector] = useState<string | null>(null);

    const instanceRef = useRef<HTMLTextAreaElement>(null);
    const [instance, setInstance] = useState<TemplateNode | undefined>();
    const [instanceHistory, setInstanceHistory] = useState<History>({
        past: [],
        present: '',
        future: [],
    });
    const [isInstanceFocused, setIsInstanceFocused] = useState(false);

    const rootRef = useRef<HTMLTextAreaElement>(null);
    const [root, setRoot] = useState<TemplateNode | undefined>();
    const [rootHistory, setRootHistory] = useState<History>({
        past: [],
        present: '',
        future: [],
    });
    const [isRootFocused, setIsRootFocused] = useState(false);

    const updateHistory = (
        value: string,
        { past, present, future }: History,
        setHistory: React.Dispatch<React.SetStateAction<History>>,
    ) => {
        setHistory({
            past: [...past, present],
            present: value,
            future: [],
        });
    };

    const undo = (history: History, setHistory: React.Dispatch<React.SetStateAction<History>>) => {
        const { past, present, future } = history;
        if (past.length === 0) {
            return;
        }

        const previous = past[past.length - 1];
        const newPast = past.slice(0, past.length - 1);

        setHistory({
            past: newPast,
            present: previous,
            future: [present, ...future],
        });
    };

    const redo = (history: History, setHistory: React.Dispatch<React.SetStateAction<History>>) => {
        const { past, present, future } = history;
        if (future.length === 0) {
            return;
        }

        const next = future[0];
        const newFuture = future.slice(1);

        setHistory({
            past: [...past, present],
            present: next,
            future: newFuture,
        });
    };

    const handleKeyDown = (
        e: React.KeyboardEvent<HTMLTextAreaElement>,
        history: History,
        setHistory: React.Dispatch<React.SetStateAction<History>>,
    ) => {
        if (showSuggestions) {
            suggestionRef.current?.handleKeyDown(e);
            return;
        }

        if (e.key === 'Enter' || e.key === 'Tab' || e.key === 'Escape') {
            e.currentTarget.blur();
            e.preventDefault();
            return;
        }

        if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
            e.preventDefault();
            if (e.shiftKey) {
                redo(history, setHistory);
            } else {
                undo(history, setHistory);
            }
        }
    };

    useEffect(() => {
        if (editorEngine.elements.selected.length > 0) {
            const selectedEl = editorEngine.elements.selected[0];
            setSelector(selectedEl.selector);

            if (!isInstanceFocused) {
                getInstanceClasses(selectedEl.selector);
            }
            if (!isRootFocused) {
                getRootClasses(selectedEl.selector);
            }
        } else {
            setSelector(null);
            setInstance(undefined);
            setRoot(undefined);
            setInstanceHistory({ past: [], present: '', future: [] });
            setRootHistory({ past: [], present: '', future: [] });
        }
    }, [editorEngine.elements.selected, editorEngine.ast.layers]);

    async function getInstanceClasses(selector: string) {
        const newInstance = editorEngine.ast.getInstance(selector);
        setInstance(newInstance);
        if (newInstance) {
            const instanceClasses: string[] = await invokeMainChannel(
                MainChannels.GET_TEMPLATE_NODE_CLASS,
                newInstance,
            );
            const classes = instanceClasses.join(' ');
            setInstanceHistory({
                past: [],
                present: classes,
                future: [],
            });
        }
    }

    async function getRootClasses(selector: string) {
        const newRoot = editorEngine.ast.getRoot(selector);
        setRoot(newRoot);
        if (newRoot) {
            const rootClasses: string[] = await invokeMainChannel(
                MainChannels.GET_TEMPLATE_NODE_CLASS,
                newRoot,
            );
            const classes = rootClasses.join(' ');
            setRootHistory({
                past: [],
                present: classes,
                future: [],
            });
        }
    }

    const createCodeDiffRequest = async (templateNode: TemplateNode, className: string) => {
        if (!currentSelector) {
            return;
        }
        const request: CodeDiffRequest = {
            templateNode,
            selector: currentSelector,
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

    const handleInput = (
        e: React.FormEvent<HTMLTextAreaElement>,
        history: History,
        setHistory: React.Dispatch<React.SetStateAction<History>>,
    ) => {
        const { value, selectionStart } = e.currentTarget;
        updateHistory(value, history, setHistory);
        suggestionRef.current?.handleInput(value, selectionStart);
    };

    const adjustHeight = (textarea: HTMLTextAreaElement) => {
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight + 20}px`;
    };

    useEffect(() => {
        if (instanceRef.current) {
            adjustHeight(instanceRef.current);
        }
    }, [instanceHistory.present]);

    useEffect(() => {
        if (rootRef.current) {
            adjustHeight(rootRef.current);
        }
    }, [rootHistory.present]);

    const EnterIndicator = () => {
        return (
            <div className="absolute bottom-1 right-2 text-xs text-gray-500 flex items-center">
                <span>enter to apply</span>
                <Icons.Reset className="ml-1" />
            </div>
        );
    };

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
                            value={instanceHistory.present}
                            onInput={(e) => handleInput(e, instanceHistory, setInstanceHistory)}
                            onKeyDown={(e) => handleKeyDown(e, instanceHistory, setInstanceHistory)}
                            onBlur={(e) => {
                                setShowSuggestions(false);
                                setIsInstanceFocused(false);
                                instance && createCodeDiffRequest(instance, e.target.value);
                            }}
                            onFocus={() => setIsInstanceFocused(true)}
                        />
                        {isInstanceFocused && (
                            <AutoComplete
                                currentInput={instanceHistory.present}
                                showSuggestions={showSuggestions}
                                ref={suggestionRef}
                                setShowSuggestions={setShowSuggestions}
                                setCurrentInput={(newValue: string) => {
                                    updateHistory(newValue, instanceHistory, setInstanceHistory);
                                    instance && createCodeDiffRequest(instance, newValue);
                                }}
                            />
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
                            value={rootHistory.present}
                            onInput={(e) => handleInput(e, rootHistory, setRootHistory)}
                            onKeyDown={(e) => handleKeyDown(e, rootHistory, setRootHistory)}
                            onBlur={(e) => {
                                setShowSuggestions(false);
                                setIsRootFocused(false);
                                root && createCodeDiffRequest(root, e.target.value);
                            }}
                            onFocus={() => setIsRootFocused(true)}
                        />
                        {isRootFocused && (
                            <AutoComplete
                                ref={suggestionRef}
                                showSuggestions={showSuggestions}
                                currentInput={rootHistory.present}
                                setShowSuggestions={setShowSuggestions}
                                setCurrentInput={(newValue: string) => {
                                    updateHistory(newValue, rootHistory, setRootHistory);
                                    root && createCodeDiffRequest(root, newValue);
                                }}
                            />
                        )}
                    </div>
                    {isRootFocused && <EnterIndicator />}
                </div>
            )}
        </div>
    );
});

export default TailwindInput;
