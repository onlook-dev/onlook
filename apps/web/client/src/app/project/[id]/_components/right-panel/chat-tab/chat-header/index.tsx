'use client';

import { useEditorEngine } from '@/components/store/editor';
import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';
import { useEffect, useState } from 'react';
import { Archive } from 'lucide-react';

// Simple green dot component
const GreenDot = () => (
    <div className="w-2 h-2 bg-green-400 rounded-full" />
);

const getStatusIcon = (status: string) => {
    switch (status) {
        case 'loading':
            return Icons.LoadingSpinner;
        case 'unread':
            return GreenDot;
        case 'pending':
            return Icons.CounterClockwiseClock;
        case 'error':
            return Icons.ExclamationTriangle;
        default:
            return null;
    }
};

const getStatusColor = (status: string, isSelected: boolean) => {
    if (isSelected) {
        return 'text-black';
    }

    switch (status) {
        case 'loading':
            return 'text-blue-400';
        case 'unread':
            return 'text-green-400';
        case 'pending':
            return 'text-yellow-400';
        case 'error':
            return 'text-red-400';
        default:
            return 'text-gray-300 hover:text-white';
    }
};

export const ChatHeader = () => {
    const editorEngine = useEditorEngine();
    const [isInputFocused, setIsInputFocused] = useState(false);
    const [isAltHeld, setIsAltHeld] = useState(false);

    const { multiChat } = editorEngine.chat;
    const activeChats = multiChat.activeChats;
    const selectedChatId = multiChat.selectedChatId;

    // Handle keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Tab cycles forward, Shift+Tab cycles backward
            if (isInputFocused && e.key === 'Tab') {
                e.preventDefault();
                if (e.shiftKey) {
                    multiChat.selectPrevChat();
                } else {
                    multiChat.selectNextChat();
                }
                return;
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            // no-op; kept for symmetry/future use
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [isInputFocused, isAltHeld, activeChats, multiChat]);

    // Remove Alt state tracking visuals, keep placeholder state for potential future UI hints

    const handleArchiveChat = (chatId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        multiChat.archiveChat(chatId);
    };

    const handleSelectChat = (chatId: string) => {
        multiChat.selectChat(chatId);
    };


    return (
        <div className="border-b border-neutral-700 bg-neutral-900">
            {/* Chat List - Always show when there are active chats */}
            {activeChats.length > 0 && (
                <div className="px-2 pb-2 space-y-1">
                {activeChats.map((chat, index) => {
                    const isSelected = selectedChatId === chat.id;
                    const StatusIcon = getStatusIcon(chat.status);
                    const hasIcon = StatusIcon !== null;

                    return (
                        <div
                            key={chat.id}
                            className={cn(
                                'group flex items-center h-10 p-1.5 rounded-lg cursor-pointer transition-colors duration-200',
                                isSelected
                                    ? 'bg-white text-black'
                                    : 'bg-neutral-800/80 backdrop-blur-sm text-white hover:bg-neutral-700/90'
                            )}
                            onClick={() => handleSelectChat(chat.id)}
                        >
                            {/* Icon container */}
                            <div
                                className={cn(
                                    'flex items-center justify-center transition-all duration-300 ease-out',
                                    hasIcon ? 'w-7 mr-2' : 'w-0 mr-0'
                                )}
                            >
                                {hasIcon && (
                                    <button
                                        className={cn(
                                            'w-7 h-7 flex items-center justify-center rounded-md transition-colors',
                                            getStatusColor(chat.status, isSelected)
                                        )}
                                    >
                                        <StatusIcon
                                            className={cn(
                                                'w-4 h-4',
                                                chat.status === 'loading' ? 'animate-spin' : ''
                                            )}
                                        />
                                    </button>
                                )}
                            </div>

                            <div className="flex items-center justify-between flex-1 transition-all duration-300 ease-out">
                                <div className="flex-1 min-w-0">
                                    <h1
                                        className={cn(
                                            'font-medium text-sm truncate transition-all duration-300 ease-out',
                                            isSelected ? 'text-black' : 'text-white'
                                        )}
                                    >
                                        {chat.conversation.title || 'New Chat'}
                                    </h1>
                                </div>
                                <div className="relative flex items-center">
                                    <div
                                        className={cn(
                                            'text-xs font-medium flex-shrink-0 transition-opacity duration-200 group-hover:opacity-0',
                                            isSelected ? 'text-black/70' : 'text-gray-400'
                                        )}
                                    >
                                        {isInputFocused && isAltHeld && index < activeChats.length ? (
                                            <span
                                                className={cn(
                                                    'px-1.5 py-0.5 rounded text-xs font-mono',
                                                    isSelected
                                                        ? 'bg-black/10 text-black/80'
                                                        : 'bg-neutral-700/50 text-white/90'
                                                )}
                                            >
                                                ⌥{index + 1}
                                            </span>
                                        ) : (
                                            new Date(chat.lastActivity).toLocaleTimeString('en-US', {
                                                hour: 'numeric',
                                                minute: '2-digit',
                                                hour12: true,
                                            })
                                        )}
                                    </div>

                                    {/* Archive button */}
                                    <button
                                        onClick={(e) => handleArchiveChat(chat.id, e)}
                                        className={cn(
                                            'absolute top-1/2 right-0 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center w-7 h-7 rounded-md transition-colors',
                                            isSelected
                                                ? 'bg-neutral-100 text-black/80 hover:bg-black/10'
                                                : 'text-gray-300 hover:bg-neutral-700/50'
                                        )}
                                    >
                                        <Archive className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
                </div>
            )}
        </div>
    );
};
