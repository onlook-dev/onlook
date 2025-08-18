import { useChatContext } from '@/app/project/[id]/_hooks/use-chat';
import { useEditorEngine } from '@/components/store/editor';
import { transKeys } from '@/i18n/keys';
import { ChatType, EditorTabValue } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { toast } from '@onlook/ui/sonner';
import { Textarea } from '@onlook/ui/textarea';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { useTranslations } from 'next-intl';
import { useRef, useState, type SetStateAction } from 'react';
import { DEFAULT_INPUT_STATE, DIMENSIONS, type InputState } from './helpers';

export const OverlayChatInput = observer(({
    inputState,
    setInputState,
}: {
    inputState: InputState,
    setInputState: (value: SetStateAction<InputState>) => void,
}) => {
    const editorEngine = useEditorEngine();
    const t = useTranslations();
    const [isComposing, setIsComposing] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const { sendMessage, isWaiting } = useChatContext();

    const handleSubmit = async () => {
        try {
            editorEngine.state.rightPanelTab = EditorTabValue.CHAT;
            await editorEngine.chat.addEditMessage(inputState.value);
            sendMessage(ChatType.EDIT);
            setInputState(DEFAULT_INPUT_STATE);
        } catch (error) {
            console.error('Error sending message', error);
            toast.error('Failed to send message. Please try again.');
        }
    };

    return (
        <div
            className={cn(
                'rounded-xl backdrop-blur-lg transition-all duration-300',
                'shadow-xl shadow-background-secondary/50',
                inputState.isInputting
                    ? 'bg-background/80 border shadow-xl shadow-background-secondary/50 p-1'
                    : 'bg-background-secondary/85 dark:bg-background/85 border-foreground-secondary/20 hover:border-foreground-secondary/50 p-0.5',
                'border flex relative',
            )}
        >
            {!inputState.isInputting ? (
                // Chat Button
                <button
                    onClick={() => setInputState((prev) => ({ ...prev, isInputting: true }))}
                    className="rounded-lg hover:text-foreground-primary transition-colors px-2.5 py-1.5 flex flex-row items-center gap-2 w-full"
                >
                    <Icons.Sparkles className="w-4 h-4" />
                    <span className="text-mini !font-medium whitespace-nowrap">
                        {t(transKeys.editor.panels.edit.tabs.chat.miniChat.button)}
                    </span>
                </button>
            ) : (
                // Input Field
                <div className="flex flex-row items-center gap-1 w-[280px] relative">
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
                        id="chat-input"
                        aria-label="Chat message input"
                        ref={textareaRef}
                        className={cn(
                            'w-full !text-xs break-words focus-visible:!ring-0 resize-none shadow-none !border-[0.5px] rounded-lg',
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
    );
});
