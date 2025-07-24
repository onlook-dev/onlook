import { useChatContext } from '@/app/project/[id]/_hooks/use-chat';
import { useEditorEngine } from '@/components/store/editor';
import type { ClickRectState } from '@/components/store/editor/overlay/state';
import { transKeys } from '@/i18n/keys';
import { api } from '@/trpc/react';
import { ChatType, EditorMode, EditorTabValue } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Textarea } from '@onlook/ui/textarea';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

const DIMENSIONS = {
    singleLineHeight: 32,
    minInputWidth: 280,
    buttonHeight: 36,
    multiLineRows: 4,
    minCharsToSubmit: 4,
};

const DEFAULT_INPUT_STATE = {
    value: '',
    isVisible: false,
    isMultiline: false,
    isSubmitting: false,
};

export const OverlayChat = observer(
    ({ selectedEl, elementId }: { selectedEl: ClickRectState | null; elementId: string }) => {
        const editorEngine = useEditorEngine();
        const { data: settings } = api.user.settings.get.useQuery();
        const { sendMessages, reload, isWaiting } = useChatContext();
        const isPreviewMode = editorEngine.state.editorMode === EditorMode.PREVIEW;
        const [inputState, setInputState] = useState(DEFAULT_INPUT_STATE);
        const [isComposing, setIsComposing] = useState(false);
        const textareaRef = useRef<HTMLTextAreaElement>(null);
        const prevChatPositionRef = useRef<{ x: number; y: number } | null>(null);
        const t = useTranslations();
        const shouldHideButton =
            !selectedEl ||
            isPreviewMode ||
            isWaiting ||
            !settings?.chat?.showMiniChat;

        useEffect(() => {
            setInputState(DEFAULT_INPUT_STATE);
        }, [elementId]);

        const chatPosition = {
            x: elementId
                ? (document.getElementById(elementId)?.getBoundingClientRect().left ?? 0)
                : 0,
            y: elementId
                ? (document.getElementById(elementId)?.getBoundingClientRect().bottom ?? 0)
                : 0,
        };

        useEffect(() => {
            prevChatPositionRef.current = chatPosition;
        }, [chatPosition.x, chatPosition.y]);

        const animationClass =
            'origin-center scale-[0.2] opacity-0 -translate-y-2 transition-all duration-200';

        useEffect(() => {
            if (elementId) {
                requestAnimationFrame(() => {
                    const element = document.querySelector(`[data-element-id="${elementId}"]`);
                    if (element) {
                        element.classList.remove('scale-[0.2]', 'opacity-0', '-translate-y-2');
                        element.classList.add('scale-100', 'opacity-100', 'translate-y-0');
                    }
                });
            }
        }, [elementId]);

        if (shouldHideButton) {
            return null;
        }

        const handleSubmit = async () => {
            const messageToSend = inputState.value;
            editorEngine.state.rightPanelTab = EditorTabValue.CHAT;
            const streamMessages = await editorEngine.chat.getEditMessages(messageToSend);
            if (!streamMessages) {
                console.error('No edit messages returned');
                return;
            }
            sendMessages(streamMessages, ChatType.EDIT);
            reload();

            setInputState(DEFAULT_INPUT_STATE);
        };

        const containerStyle: React.CSSProperties = {
            position: 'fixed',
            top: Math.max(74 + 8, selectedEl.top - 8),
            left: selectedEl.left + selectedEl.width / 2,
            transform: 'translate(-50%, 0)',
            transformOrigin: 'center center',
            pointerEvents: 'auto',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        };

        return (
            <div
                style={containerStyle}
                onClick={(e) => e.stopPropagation()}
                className={animationClass}
                data-element-id={elementId}
            >
                <div
                    className={cn(
                        'rounded-xl backdrop-blur-lg transition-all duration-300',
                        'shadow-xl shadow-background-secondary/50',
                        inputState.isVisible
                            ? 'bg-background/80 border shadow-xl shadow-background-secondary/50 p-1'
                            : 'bg-background-secondary/85 dark:bg-background/85 border-foreground-secondary/20 hover:border-foreground-secondary/50 p-0.5',
                        'border flex relative',
                    )}
                >
                    {!inputState.isVisible ? (
                        // Chat Button
                        <button
                            onClick={() => setInputState((prev) => ({ ...prev, isVisible: true }))}
                            className="rounded-lg hover:text-foreground-primary transition-colors px-2.5 py-1.5 flex flex-row items-center gap-2 w-full"
                        >
                            <Icons.Sparkles className="w-4 h-4" />
                            <span className="text-miniPlus whitespace-nowrap">
                                {t(transKeys.editor.panels.edit.tabs.chat.miniChat.button)}
                            </span>
                        </button>
                    ) : (
                        // Input Field
                        <div className="flex flex-row items-top gap-1 w-full min-w-[280px] relative">
                            <Button
                                size="icon"
                                onClick={() =>
                                    setInputState((prev) => ({
                                        ...prev,
                                        isVisible: false,
                                        value: '',
                                    }))
                                }
                                className={cn(
                                    'group h-6 w-6 absolute left-1 top-1 z-10 border-none shadow-none bg-transparent hover:bg-transparent',
                                    'transition-all duration-200',
                                    inputState.value.trim().length >= DIMENSIONS.minCharsToSubmit
                                        ? 'opacity-0 -translate-x-2 scale-75 pointer-events-none'
                                        : 'opacity-100 translate-x-0 scale-100 pointer-events-auto',
                                )}
                                disabled={inputState.isSubmitting}
                            >
                                <Icons.CrossS className="h-4 w-4 text-foreground-secondary group-hover:text-foreground transition-colors" />
                            </Button>
                            <Textarea
                                aria-label="Chat message input"
                                ref={textareaRef}
                                className={cn(
                                    'w-full text-xs break-words p-1.5 focus-visible:ring-0 resize-none shadow-none border-[0.5px] rounded-lg',
                                    'transition-all duration-150 ease-in-out',
                                    'pr-10 backdrop-blur-lg',
                                    inputState.value.trim().length >= DIMENSIONS.minCharsToSubmit
                                        ? 'pl-2'
                                        : 'pl-8',
                                    'bg-background-secondary/75 text-foreground-primary border-background-secondary/75',
                                    'max-h-[80px] caret-[#FA003C]',
                                    'selection:bg-[#FA003C]/30 selection:text-[#FA003C]',
                                )}
                                value={inputState.value}
                                onChange={(e) => {
                                    setInputState((prev) => ({ ...prev, value: e.target.value }));
                                    if (textareaRef.current) {
                                        textareaRef.current.style.height = 'auto';
                                        const maxHeight = DIMENSIONS.singleLineHeight * 4;
                                        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, maxHeight)}px`;
                                        textareaRef.current.scrollTop =
                                            textareaRef.current.scrollHeight;
                                    }
                                }}
                                placeholder={t(transKeys.editor.panels.edit.tabs.chat.input.placeholder)}
                                style={{
                                    resize: 'none',
                                    minHeight: DIMENSIONS.singleLineHeight,
                                    height: 'auto',
                                    overflowY: 'auto',
                                    overflowX: 'hidden',
                                    overscrollBehavior: 'contain',
                                    lineHeight: '1.5',
                                }}
                                rows={1}
                                autoFocus
                                disabled={inputState.isSubmitting}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
                                        e.preventDefault();
                                        const charCount = inputState.value.trim().length;
                                        if (charCount >= DIMENSIONS.minCharsToSubmit) {
                                            handleSubmit();
                                        }
                                    } else if (e.key === 'Escape') {
                                        e.preventDefault();
                                        setInputState((prev) => ({
                                            ...prev,
                                            isVisible: false,
                                            value: '',
                                        }));
                                    }
                                }}
                                onCompositionStart={() => setIsComposing(true)}
                                onCompositionEnd={(e) => {
                                    setIsComposing(false);
                                }}
                            />
                            {inputState.value.trim().length >= DIMENSIONS.minCharsToSubmit && (
                                <Button
                                    size="icon"
                                    variant="secondary"
                                    onClick={handleSubmit}
                                    className={cn(
                                        'absolute right-0.5 bottom-0.5 h-7 w-7',
                                        'bg-foreground-primary text-white hover:bg-foreground-hover',
                                    )}
                                    disabled={inputState.isSubmitting}
                                >
                                    <Icons.ArrowRight className="h-4 w-4 text-background" />
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    },
);
