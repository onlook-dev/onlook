import { useEditorEngine } from '@/components/Context';
import { Button } from '@onlook/ui/button';
import { Textarea } from '@onlook/ui/textarea';
import { Icons } from '@onlook/ui/icons';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';

export const ChatInput = observer(() => {
    const editorEngine = useEditorEngine();
    const [input, setInput] = useState('');

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
        editorEngine.chat.sendMessage(input);
        setInput('');
    }

    return (
        <>
            <div className="flex w-full text-foreground-tertiary pt-4 px-4 border-t text-small">
                <Textarea
                    placeholder="Ask follow up questions or provide more context..."
                    className="p-0 border-0 shadow-none rounded-none caret-[#FA003C] selection:bg-[#FA003C]/30 selection:text-[#FA003C] text-foreground-primary placeholder:text-foreground-primary/50"
                    rows={1}
                    style={{ resize: 'none' }}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onInput={handleInput}
                    onKeyDown={handleKeyDown}
                />
            </div>
            <div className="flex flex-row w-full justify-between pt-5 pb-4 px-4">
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
                <Button
                    size={'icon'}
                    variant={'secondary'}
                    className="text-smallPlus w-fit h-full py-0.5 px-2.5 text-primary"
                    disabled={!input || editorEngine.chat.isWaiting || input.trim().length === 0}
                    onClick={sendMessage}
                >
                    <Icons.ArrowRight />
                </Button>
            </div>
        </>
    );
});
