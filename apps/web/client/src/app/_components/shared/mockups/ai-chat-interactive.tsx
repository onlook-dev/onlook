import React, { useState } from 'react';

import { Icons } from '@onlook/ui/icons';

const chatMessages = [
    { sender: 'user', type: 'text', text: 'Design me an inventory tracker website for my Cafe' },
    {
        sender: 'ai',
        type: 'text',
        text: "Absolutely! Let's start by getting the general layout in place with a top navigation bar and a main content area.",
    },
    {
        sender: 'ai',
        type: 'tool',
        tool: 'Generate code',
        toolName: 'generateCode',
        args: { style: 'modern', color: 'blue' },
    },
];

const PRESET_SENTENCE = 'Add a section for baristas to upsell new seasonal flavors';

function UserMessage({ text }: { text: string }) {
    return (
        <div className="group relative flex w-full flex-row justify-end px-2">
            <div className="bg-background-secondary text-foreground-secondary relative ml-8 flex w-[80%] flex-col rounded-lg rounded-br-none border-[0.5px] p-2 shadow-sm">
                <div className="text-small">{text ?? ''}</div>
            </div>
        </div>
    );
}

function AiMessage({ text }: { text: string }) {
    return (
        <div className="group relative flex w-full flex-row justify-start px-2">
            <div className="text-foreground-primary relative mr-8 flex w-[90%] flex-col rounded-lg rounded-bl-none bg-none p-1 shadow-sm">
                <div className="text-small mt-1">{text ?? ''}</div>
            </div>
        </div>
    );
}

function ToolCallDisplay({ toolName }: { toolName: string }) {
    return (
        <div className="px-2">
            <div className="bg-background-onlook/20 relative rounded-lg border">
                <div className="text-foreground-secondary flex items-center justify-between py-2 pl-3 transition-colors">
                    <div className="flex items-center gap-2">
                        <Icons.LoadingSpinner className="text-foreground-secondary h-4 w-4 animate-spin" />
                        <span className="text-small animate-shimmer pointer-events-none bg-gradient-to-l from-white/20 via-white/90 to-white/20 bg-[length:200%_100%] bg-clip-text text-transparent drop-shadow-[0_0_14px_rgba(255,255,255,1)] filter select-none">
                            Website.tsx
                        </span>
                    </div>
                    <Icons.ChevronDown className="text-foreground-tertiary mr-2 h-4 w-4" />
                </div>
            </div>
        </div>
    );
}

export function AiChatInteractive() {
    const [displayedText, setDisplayedText] = useState('');
    const [currentIndex, setCurrentIndex] = useState(0);

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const input = e.target.value;

        if (input.length > displayedText.length) {
            const newIndex = Math.min(currentIndex + 1, PRESET_SENTENCE.length);
            setCurrentIndex(newIndex);
            setDisplayedText(PRESET_SENTENCE.slice(0, newIndex));
        } else if (input.length < displayedText.length) {
            const newIndex = Math.max(currentIndex - 1, 0);
            setCurrentIndex(newIndex);
            setDisplayedText(PRESET_SENTENCE.slice(0, newIndex));
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            setCurrentIndex(0);
            setDisplayedText('');
            return;
        }

        if (e.key === 'Backspace' && (e.metaKey || e.altKey)) {
            e.preventDefault();

            if (e.metaKey) {
                setCurrentIndex(0);
                setDisplayedText('');
            } else if (e.altKey) {
                const words = PRESET_SENTENCE.slice(0, currentIndex).split(' ');
                if (words.length > 1) {
                    words.pop();
                    const newText = words.join(' ');
                    const newIndex = newText.length;
                    setCurrentIndex(newIndex);
                    setDisplayedText(newText);
                } else {
                    setCurrentIndex(0);
                    setDisplayedText('');
                }
            }
            return;
        }

        if (e.key !== 'Backspace' && e.key !== 'Delete' && e.key.length === 1) {
            e.preventDefault();

            if (currentIndex < PRESET_SENTENCE.length) {
                const newIndex = currentIndex + 1;
                setCurrentIndex(newIndex);
                setDisplayedText(PRESET_SENTENCE.slice(0, newIndex));
            }
        }
    };

    return (
        <div className="bg-background-onlook/80 relative h-100 w-full overflow-hidden rounded-lg">
            <div className="border-foreground-primary/20 absolute bottom-8 left-1/2 flex w-80 -translate-x-1/2 flex-col overflow-hidden rounded-xl border bg-black/85 shadow-lg">
                <div className="space-y-2 py-2 pt-24">
                    {chatMessages.map((msg, idx) => {
                        if (msg.type === 'text' && msg.sender === 'user') {
                            return <UserMessage key={idx} text={msg.text ?? ''} />;
                        }
                        if (msg.type === 'text' && msg.sender === 'ai') {
                            return <AiMessage key={idx} text={msg.text ?? ''} />;
                        }
                        if (msg.type === 'tool') {
                            return <ToolCallDisplay key={idx} toolName={msg.toolName ?? ''} />;
                        }
                        return null;
                    })}
                </div>
                <div className="border-foreground-primary/10 flex flex-col items-start gap-1 border-t px-2.5 py-2">
                    <textarea
                        value={displayedText}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        className="text-foreground-primary placeholder-foreground-tertiary text-regular mb-5 h-20 w-full flex-1 resize-none rounded-lg bg-transparent px-0.5 pt-2 outline-none"
                        placeholder="Type a message..."
                        rows={3}
                        maxLength={PRESET_SENTENCE.length}
                    />
                    <div className="flex w-full flex-row items-center justify-between gap-2">
                        <button
                            className="flex flex-row items-center gap-2 rounded-lg px-1 py-2"
                            disabled
                        >
                            <Icons.Build className="text-foreground-tertiary/50 h-4 w-4" />
                            <p className="text-foreground-secondary/50 text-small">Build</p>
                        </button>
                        <div className="flex flex-row gap-1">
                            <button
                                className="bg-background-secondary/0 hover:bg-background-secondary group cursor-copy rounded-lg px-2 py-2"
                                disabled
                            >
                                <Icons.Image className="text-foreground-tertiary/50 group-hover:text-foreground-primary h-4 w-4" />
                            </button>
                            <button
                                className={`cursor-pointer rounded-full px-2 py-2 ${currentIndex === PRESET_SENTENCE.length ? 'bg-foreground-primary' : 'bg-foreground-onlook'}`}
                                disabled
                            >
                                <Icons.ArrowRight className="text-background-secondary h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
