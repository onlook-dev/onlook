import type { SetStateAction } from 'react';
import { useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useTranslations } from 'next-intl';

import { ChatType, EditorTabValue } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { toast } from '@onlook/ui/sonner';
import { Textarea } from '@onlook/ui/textarea';
import { cn } from '@onlook/ui/utils';

import type { InputState } from './helpers';
import { useEditorEngine } from '@/components/store/editor';
import { transKeys } from '@/i18n/keys';
import { DEFAULT_INPUT_STATE, DIMENSIONS } from './helpers';

export const OverlayChatInput = observer(
    ({
        inputState,
        setInputState,
    }: {
        inputState: InputState;
        setInputState: (value: SetStateAction<InputState>) => void;
    }) => {
        const editorEngine = useEditorEngine();
        const t = useTranslations();
        const [isComposing, setIsComposing] = useState(false);
        const textareaRef = useRef<HTMLTextAreaElement>(null);

        const handleSubmit = async () => {
            toast.promise(
                async () => {
                    editorEngine.state.rightPanelTab = EditorTabValue.CHAT;
                    void editorEngine.chat.sendMessage(inputState.value, ChatType.EDIT);
                },
                {
                    loading: 'Sending message...',
                    success: 'Message sent',
                    error: 'Failed to send message',
                },
            );

            setInputState(DEFAULT_INPUT_STATE);
        };

        return (
            <div
                className={cn(
                    'rounded-xl backdrop-blur-lg transition-all duration-300',
                    'shadow-background-secondary/50 shadow-xl',
                    inputState.isInputting
                        ? 'bg-background/80 shadow-background-secondary/50 border p-1 shadow-xl'
                        : 'bg-background-secondary/85 dark:bg-background/85 border-foreground-secondary/20 hover:border-foreground-secondary/50 p-0.5',
                    'relative flex border',
                )}
            >
                {!inputState.isInputting ? (
                    // Chat Button
                    <button
                        onClick={() => setInputState((prev) => ({ ...prev, isInputting: true }))}
                        className="hover:text-foreground-primary flex w-full flex-row items-center gap-2 rounded-lg px-2.5 py-1.5 transition-colors"
                    >
                        <Icons.Sparkles className="h-4 w-4" />
                        <span className="text-mini !font-medium whitespace-nowrap">
                            {t(transKeys.editor.panels.edit.tabs.chat.miniChat.button)}
                        </span>
                    </button>
                ) : (
                    // Input Field
                    <div className="relative flex w-[280px] flex-row items-center gap-1">
                        <Button
                            size="icon"
                            onClick={() =>
                                setInputState((prev) => ({
                                    ...prev,
                                    isInputting: false,
                                    value: '',
                                }))
                            }
                            className={cn(
                                'group absolute top-1 left-1 z-10 h-6 w-6 border-none bg-transparent shadow-none hover:bg-transparent',
                                'transition-all duration-200',
                                inputState.value.trim().length >= DIMENSIONS.minCharsToSubmit
                                    ? 'pointer-events-none -translate-x-2 scale-75 opacity-0'
                                    : 'pointer-events-auto translate-x-0 scale-100 opacity-100',
                            )}
                            disabled={inputState.isSubmitting}
                        >
                            <Icons.CrossS className="text-foreground-secondary group-hover:text-foreground h-4 w-4 transition-colors" />
                        </Button>
                        <Textarea
                            id="chat-input"
                            aria-label="Chat message input"
                            ref={textareaRef}
                            className={cn(
                                'w-full resize-none rounded-lg !border-[0.5px] !text-xs break-words shadow-none focus-visible:!ring-0',
                                'transition-all duration-150 ease-in-out',
                                'pr-10 backdrop-blur-lg',
                                inputState.value.trim().length >= DIMENSIONS.minCharsToSubmit
                                    ? '!pl-2'
                                    : '!pl-8',
                                '!bg-background-secondary/75 text-foreground-primary !border-background-secondary/75',
                                'max-h-[80px] caret-[#FA003C]',
                                'selection:bg-[#FA003C]/30 selection:text-[#FA003C]',
                                '!min-h-0',
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
                            placeholder={t(
                                transKeys.editor.panels.edit.tabs.chat.input.placeholder,
                            )}
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
                                        isInputting: false,
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
                                    'bg-foreground-primary hover:bg-foreground-hover text-white',
                                )}
                                disabled={inputState.isSubmitting}
                            >
                                <Icons.ArrowRight className="text-background h-4 w-4" />
                            </Button>
                        )}
                    </div>
                )}
            </div>
        );
    },
);
