import { useEditorEngine } from '@/components/Context';
import type { ChatMessageContext } from '@onlook/models/chat';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Textarea } from '@onlook/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { DraftContextPill } from './ContextPills/DraftContextPill';

export const ChatInput = observer(() => {
    const editorEngine = useEditorEngine();
    const [input, setInput] = useState('');
    const disabled =
        editorEngine.chat.isWaiting || editorEngine.chat.context.displayContext.length === 0;
    const inputEmpty = !input || input.trim().length === 0;
    function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
        e.currentTarget.style.height = 'auto';
        e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    }

    function sendMessage() {
        if (inputEmpty) {
            console.warn('Empty message');
            return;
        }
        if (editorEngine.chat.isWaiting) {
            console.warn('Already waiting for response');
            return;
        }
        editorEngine.chat.sendNewMessage(input);
        setInput('');
    }

    const handleRemoveContext = (contextToRemove: ChatMessageContext) => {
        const newContext = editorEngine.chat.context.displayContext.filter(
            (context) => context !== contextToRemove,
        );
        editorEngine.chat.context.displayContext = newContext;
    };

    return (
        <>
            <div className="flex flex-col w-full text-foreground-tertiary pt-4 px-4 border-t text-small">
                <div
                    className={cn(
                        'flex flex-row flex-wrap w-full gap-1.5 text-micro mb-1 text-foreground-secondary transition-height duration-200',
                        editorEngine.chat.context.displayContext.length > 0 ? 'min-h-6' : 'h-0',
                    )}
                >
                    {editorEngine.chat.context.displayContext.map(
                        (context: ChatMessageContext, index: number) => (
                            <DraftContextPill
                                key={index + context.content}
                                context={context}
                                onRemove={() => handleRemoveContext(context)}
                            />
                        ),
                    )}
                </div>
                <Textarea
                    disabled={disabled}
                    placeholder={
                        disabled
                            ? 'Select an element to start'
                            : 'Ask follow up questions or provide more context...'
                    }
                    className="mt-2 overflow-auto max-h-24 text-small p-0 border-0 shadow-none rounded-none caret-[#FA003C] selection:bg-[#FA003C]/30 selection:text-[#FA003C] text-foreground-primary placeholder:text-foreground-primary/50"
                    rows={3}
                    style={{ resize: 'none' }}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onInput={handleInput}
                    onKeyDown={handleKeyDown}
                />
            </div>
            <div className="flex flex-row w-full justify-between pt-4 pb-4 px-4">
                <div className="flex flex-row justify-start gap-1.5 invisible">
                    <Button
                        variant={'outline'}
                        className="w-fit h-fit py-0.5 px-2.5 text-foreground-tertiary"
                    >
                        <Icons.Image className="mr-2" />
                        <span className="text-smallPlus">Image</span>
                    </Button>
                    <Button
                        variant={'outline'}
                        className="w-fit h-fit py-0.5 px-2.5 text-foreground-tertiary"
                    >
                        <Icons.FilePlus className="mr-2" />
                        <span className="text-smallPlus">File Reference</span>
                    </Button>
                </div>
                {editorEngine.chat.isWaiting ? (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                size={'icon'}
                                variant={'secondary'}
                                className="text-smallPlus w-fit h-full py-0.5 px-2.5 text-primary"
                                onClick={editorEngine.chat.stopStream}
                            >
                                <Icons.Stop />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>{'Stop response'}</TooltipContent>
                    </Tooltip>
                ) : (
                    <Button
                        size={'icon'}
                        variant={'secondary'}
                        className="text-smallPlus w-fit h-full py-0.5 px-2.5 text-primary"
                        disabled={inputEmpty || editorEngine.chat.isWaiting}
                        onClick={sendMessage}
                    >
                        <Icons.ArrowRight />
                    </Button>
                )}
            </div>
        </>
    );
});
