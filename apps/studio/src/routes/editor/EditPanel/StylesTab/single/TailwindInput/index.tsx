import { useEditorEngine } from '@/components/Context';
import { StyleMode } from '@/lib/editor/engine/style';
import { invokeMainChannel, sendAnalytics } from '@/lib/utils';
import type { CodeDiffRequest } from '@onlook/models/code';
import { MainChannels } from '@onlook/models/constants';
import type { TemplateNode } from '@onlook/models/element';
import { Icons } from '@onlook/ui/icons';
import { Textarea } from '@onlook/ui/textarea';
import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '@onlook/ui/tooltip';
import { cn } from '@onlook/ui/utils';
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

    const didChangeFromOriginal = (history: History, value: string) => {
        if (history.past.length === 0) {
            return false;
        }
        return history.past[0] !== value;
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

    const EnterIndicator = ({ isInstance = false }: { isInstance?: boolean }) => {
        return (
            <div
                className={cn(
                    'absolute bottom-1 right-2 text-xs flex items-center',
                    isInstance
                        ? 'text-purple-300 dark:text-purple-300 selection:text-purple-50 selection:bg-purple-500/50 dark:selection:text-purple-50 dark:selection:bg-purple-500/50'
                        : 'text-gray-500 selection:bg-gray-200 dark:selection:bg-gray-700',
                )}
            >
                <span>enter to apply</span>
                <Icons.Return className="ml-0.5" />
            </div>
        );
    };

    return (
        <div className="flex flex-col gap-2 text-xs text-foreground-onlook shadow-none">
            {root && (
                <div className="relative">
                    <div className="group cursor-pointer">
                        {instance && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        className={cn(
                                            'w-full flex items-center rounded-t h-6 px-1.5 gap-1 transition-colors border-[0.5px]',
                                            editorEngine.style.mode === StyleMode.Root
                                                ? 'bg-background-primary text-foreground-active border-background-tertiary'
                                                : 'bg-background-secondary text-foreground-muted border-background-secondary group-hover:bg-background-primary/20 group-hover:text-foreground-active group-hover:border-background-tertiary/90 cursor-pointer',
                                        )}
                                        onClick={() => {
                                            editorEngine.style.mode = StyleMode.Root;
                                            rootRef.current?.focus();
                                        }}
                                    >
                                        <Icons.Component className="h-3 w-3" />{' '}
                                        {'Main Component Classes'}
                                    </button>
                                </TooltipTrigger>
                                <TooltipPortal container={document.getElementById('style-tab-id')}>
                                    <TooltipContent>
                                        {'Changes apply to component code. This is the default.'}
                                    </TooltipContent>
                                </TooltipPortal>
                            </Tooltip>
                        )}
                        <Textarea
                            ref={rootRef}
                            className={cn(
                                'w-full text-xs break-normal p-1.5 focus-visible:ring-0 resize-none shadow-none border-[0.5px]',
                                'transition-colors duration-150',
                                instance ? 'rounded-t-none' : '',
                                editorEngine.style.mode === StyleMode.Root
                                    ? 'bg-background-tertiary text-foreground-active border-background-tertiary cursor-text'
                                    : 'bg-background-secondary/75 text-foreground-muted border-background-secondary/75 group-hover:bg-background-tertiary/50 group-hover:text-foreground-active group-hover:border-background-tertiary/50 cursor-pointer',
                            )}
                            placeholder="Add tailwind classes here"
                            value={rootHistory.present}
                            onInput={(e) => handleInput(e, rootHistory, setRootHistory)}
                            onKeyDown={(e) => handleKeyDown(e, rootHistory, setRootHistory)}
                            onBlur={(e) => {
                                setShowSuggestions(false);
                                setIsRootFocused(false);
                                root &&
                                    didChangeFromOriginal(rootHistory, e.target.value) &&
                                    createCodeDiffRequest(root, e.target.value);
                            }}
                            onFocus={() => {
                                editorEngine.style.mode = StyleMode.Root;
                                setIsRootFocused(true);
                            }}
                            onClick={() => {
                                if (editorEngine.style.mode !== StyleMode.Root) {
                                    editorEngine.style.mode = StyleMode.Root;
                                    rootRef.current?.focus();
                                }
                            }}
                        />
                        {isRootFocused && (
                            <AutoComplete
                                ref={suggestionRef}
                                showSuggestions={showSuggestions}
                                currentInput={rootHistory.present}
                                setShowSuggestions={setShowSuggestions}
                                setCurrentInput={(newValue: string) => {
                                    updateHistory(newValue, rootHistory, setRootHistory);
                                    root &&
                                        didChangeFromOriginal(rootHistory, newValue) &&
                                        createCodeDiffRequest(root, newValue);
                                }}
                            />
                        )}
                    </div>
                    {isRootFocused && <EnterIndicator />}
                </div>
            )}

            {instance && (
                <div className="relative">
                    <div
                        className={cn(
                            'group',
                            editorEngine.style.mode !== StyleMode.Instance && 'cursor-pointer',
                        )}
                    >
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    className={cn(
                                        'w-full flex items-center rounded-t h-6 px-1.5 gap-1 transition-colors border-[0.5px]',
                                        editorEngine.style.mode === StyleMode.Instance
                                            ? 'bg-purple-600 text-purple-50 border-purple-600 dark:bg-purple-700 dark:text-purple-50 dark:border-purple-700'
                                            : 'bg-background-secondary text-foreground-muted border-background-secondary/90 group-hover:bg-purple-200 group-hover:text-purple-900 group-hover:border-purple-200 dark:group-hover:bg-purple-900/50 dark:group-hover:text-purple-100 dark:group-hover:border-purple-900/50',
                                    )}
                                    onClick={() => {
                                        editorEngine.style.mode = StyleMode.Instance;
                                        instanceRef.current?.focus();
                                    }}
                                >
                                    <Icons.ComponentInstance className="h-3 w-3" /> Instance Classes
                                </button>
                            </TooltipTrigger>
                            <TooltipPortal container={document.getElementById('style-tab-id')}>
                                <TooltipContent>{'Changes apply to instance code.'}</TooltipContent>
                            </TooltipPortal>
                        </Tooltip>
                        <Textarea
                            ref={instanceRef}
                            className={cn(
                                'w-full text-xs break-normal p-1.5 focus-visible:ring-0 resize-none shadow-none rounded-t-none border-[0.5px]',
                                'transition-colors duration-150',
                                editorEngine.style.mode === StyleMode.Instance
                                    ? 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-900/75 dark:text-purple-100 dark:border-purple-600'
                                    : 'bg-background-secondary/75 text-foreground-muted border-background-secondary/75 group-hover:bg-purple-100/50 group-hover:text-purple-900 group-hover:border-purple-200 dark:group-hover:bg-purple-900/30 dark:group-hover:text-purple-100 dark:group-hover:border-purple-900/30 cursor-pointer',
                            )}
                            placeholder="Add tailwind classes here"
                            value={instanceHistory.present}
                            onInput={(e) => handleInput(e, instanceHistory, setInstanceHistory)}
                            onKeyDown={(e) => handleKeyDown(e, instanceHistory, setInstanceHistory)}
                            onBlur={(e) => {
                                setShowSuggestions(false);
                                setIsInstanceFocused(false);
                                instance &&
                                    didChangeFromOriginal(instanceHistory, e.target.value) &&
                                    createCodeDiffRequest(instance, e.target.value);
                            }}
                            onFocus={() => {
                                editorEngine.style.mode = StyleMode.Instance;
                                setIsInstanceFocused(true);
                            }}
                            onClick={() => {
                                if (editorEngine.style.mode !== StyleMode.Instance) {
                                    editorEngine.style.mode = StyleMode.Instance;
                                    instanceRef.current?.focus();
                                }
                            }}
                        />
                        {isInstanceFocused && (
                            <AutoComplete
                                ref={suggestionRef}
                                showSuggestions={showSuggestions}
                                currentInput={instanceHistory.present}
                                setShowSuggestions={setShowSuggestions}
                                setCurrentInput={(newValue: string) => {
                                    updateHistory(newValue, instanceHistory, setInstanceHistory);
                                    instance &&
                                        didChangeFromOriginal(instanceHistory, newValue) &&
                                        createCodeDiffRequest(instance, newValue);
                                }}
                            />
                        )}
                    </div>
                    {isInstanceFocused && <EnterIndicator isInstance={true} />}
                </div>
            )}
        </div>
    );
});

export default TailwindInput;
