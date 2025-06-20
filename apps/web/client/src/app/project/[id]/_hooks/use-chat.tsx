import { ChatType } from '@/app/api/chat/route';
import { useEditorEngine } from '@/components/store/editor';
import type { EditorEngine } from '@/components/store/editor/engine';
import { useChat, type UseChatHelpers } from '@ai-sdk/react';
import {
    LIST_FILES_TOOL_NAME,
    LIST_FILES_TOOL_PARAMETERS,
    ONLOOK_INSTRUCTIONS,
    ONLOOK_INSTRUCTIONS_TOOL_NAME,
    READ_FILES_TOOL_NAME,
    READ_FILES_TOOL_PARAMETERS,
    READ_STYLE_GUIDE_TOOL_NAME,
} from '@onlook/ai';
import type { Message, ToolCall } from 'ai';
import { reaction } from 'mobx';
import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { z } from 'zod';
import { debounce } from '@/components/store/editor/network/utils';

type ExtendedUseChatHelpers = UseChatHelpers & { 
    sendMessages: (messages: Message[], type: ChatType) => Promise<string | null | undefined>
    isNetworkPaused:boolean,
    canResume:boolean,
    resumeStream:() => Promise<void>,
    retryLastMessage:() => Promise<void>,
};

const ChatContext = createContext<ExtendedUseChatHelpers | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
    const editorEngine = useEditorEngine();
   
    const [isNetworkPaused,setIsNetworkPaused] = useState(false);
    const [canResume,setCanResume] = useState(false);
    const [lastFailedMessages,setLastFailedMessages] = useState<Message[] | null>(null);
    const [lastChatType,setLastChatType] = useState<ChatType>(ChatType.EDIT);

    
    const networkPauseRef = useRef(false);

    const chat = useChat({
        id: 'user-chat',
        api: '/api/chat',
        maxSteps: 10,
        onToolCall: (toolCall) => handleToolCall(toolCall.toolCall, editorEngine),
        onFinish: (message, config) => {
            console.log('config', config);
            if (config.finishReason === 'stop' || config.finishReason === 'error') {
                editorEngine.chat.conversation.addAssistantMessage(message);

                

                if (!networkPauseRef.current) {
                    setIsNetworkPaused(false);
                    setCanResume(false);
                    setLastFailedMessages(null);
                }
            }
        },
        onError: (error) => {
            console.error('Error in chat', error);
            editorEngine.chat.error.handleChatError(error);
            handleChatError(error);
        },
    });
    
    
    const debouncedHandleDisconnection = useCallback(
        debounce(() => handleNetworkDisconnection(), 200),
        []
    );

    const debouncedHandleReconnection = useCallback(
        debounce(() => handleNetworkReconnection(), 500),
        []
    );

    const debouncedHandleQualityChange = useCallback(
        debounce((quality: string) => handleNetworkQualityChange(quality), 300),
        []
    );

    useEffect(() => {
       
        const disposeReaction = reaction(
            () => ({
                isOnline: editorEngine.network.status.isOnline,
                connectionQuality: editorEngine.network.status.connectionQuality,
                isConnecting: editorEngine.network.status.isConnecting,
                reconnectAttempts: editorEngine.network.status.reconnectAttempts,
                maxReconnectAttempts: editorEngine.network.status.maxReconnectAttempts,
            }),
            (current, previous) => {
                console.log('🌐 Network state changed:', { current, previous });
                
                
                if (previous) {
                    if (!current.isOnline && previous.isOnline) {
                        
                        console.log('🔴 Network went offline');
                        
                       
                        if (chat.isLoading) {
                            handleNetworkDisconnection();
                        } else {
                            debouncedHandleDisconnection();
                        }
                    } else if (current.isOnline && !previous.isOnline) {
                        
                        console.log('🟢 Network came online');
                        debouncedHandleReconnection();
                    } else if (current.connectionQuality !== previous.connectionQuality) {
                        
                        console.log('⚡ Connection quality changed:', previous.connectionQuality, '→', current.connectionQuality);
                        debouncedHandleQualityChange(current.connectionQuality);
                    } else if (current.reconnectAttempts >= current.maxReconnectAttempts && !current.isOnline && current.reconnectAttempts !== previous.reconnectAttempts) {
                        
                        console.log('❌ Max reconnect attempts reached');
                        handleMaxAttemptsReached();
                    }
                }
            },
            { 
                fireImmediately: false,
                name: 'NetworkStateReaction' // For debugging
            }
        );

        return () => {
            disposeReaction();
            
            debouncedHandleDisconnection.cancel();
            debouncedHandleReconnection.cancel();
            debouncedHandleQualityChange.cancel();
        };
    }, [editorEngine.network, debouncedHandleDisconnection, debouncedHandleReconnection, debouncedHandleQualityChange]);

    const handleNetworkDisconnection = () =>{
        if(chat.isLoading){
            console.log('🔴 Network lost during streaming - pausing chat');
            
            
            const snapshot = [...chat.messages];
            
            
            setLastFailedMessages(snapshot);
            setLastChatType(lastChatType);
            
            
            chat.stop();
            
            chat.setMessages(snapshot);

            setIsNetworkPaused(true);
            setCanResume(true);
            networkPauseRef.current = true;
        }
    };

    const handleNetworkReconnection = () => {
        console.log('🟢 Network reconnected');
        
        if (isNetworkPaused && canResume) {
           
            setTimeout(async () => {
                if (editorEngine.network.status.connectionQuality !== 'offline') {
                    await resumeStream();
                }
            }, 1000); 
        }
    }
    
    const handleNetworkQualityChange = (newQuality: string) => {
        if (newQuality === 'poor' && chat.isLoading) {
            console.warn('⚠️ Poor network quality detected during streaming');
            
        }
    };

    const handleChatError = (error: any) => {
        
        const isNetworkError = isNetworkRelatedError(error);
            
        if (isNetworkError) {
            console.log('🌐 Network error detected in chat:', error);
            handleNetworkDisconnection();
        } else {
            console.error('Chat error:', error);
        }
    };

    
    const isNetworkRelatedError = (error: any): boolean => {
        if (!error) return false;

       
        const networkErrorNames = [
            'NetworkError',
            'TypeError', 
            'AbortError',
            'TimeoutError'
        ];
        
        if (networkErrorNames.includes(error.name)) {
            return true;
        }

       
        const networkErrorCodes = [
            'NETWORK_ERROR',
            'FETCH_ERROR', 
            'TIMEOUT_ERROR',
            'ABORT_ERROR',
            'ERR_NETWORK',
            'ERR_INTERNET_DISCONNECTED',
            'ERR_CONNECTION_REFUSED',
            'ERR_CONNECTION_RESET',
            'ERR_CONNECTION_TIMED_OUT',
            'ECONNRESET'
        ];

        if (error.code && networkErrorCodes.includes(error.code)) {
            return true;
        }

        
        if (error instanceof TypeError && error.message === 'Failed to fetch') {
            return true;
        }

        
        if (error.name === 'AbortError' || error instanceof DOMException) {
            return true;
        }

        
        if (error.cause && isNetworkRelatedError(error.cause)) {
            return true;
        }

       
        if (error.name === 'StreamingError' && error.message?.includes('network')) {
            return true;
        }

       
        if (error instanceof Error && (
            error.message.includes('ECONNRESET') ||
            error.message.includes('terminated') ||
            error.message.includes('failed to pipe') ||
            error.message.includes('Connection reset')
        )) {
            return true;
        }

        
        if (!editorEngine.network.status.isOnline) {
            console.log('🌐 Network is offline, treating error as network-related');
            return true;
        }

        return false;
    };

    const sendMessages = async (messages: Message[], type: ChatType = ChatType.EDIT) => {
        editorEngine.chat.error.clear();
        setLastChatType(type);
        if(!editorEngine.network.status.isOnline){
            console.warn('❌ Cannot send message - no network connection');
            setLastFailedMessages(messages);
            setCanResume(true);
            return null;
        }
        if (editorEngine.network.status.connectionQuality === 'poor') {
            console.warn('⚠️ Sending message with poor network quality');
        }

        chat.setMessages(messages);
        return chat.reload({
            body: {
                chatType: type,
            },
        });
    };

   
    const sanitizeMessages = (messages: Message[]): Message[] => {
        const copy = [...messages];
        const last = copy[copy.length - 1];
        if (last && last.role === 'assistant') {
            copy.pop();
        }
        return copy;
    };

    const resumeStream = async () => {
        if (!canResume || !lastFailedMessages) {
            console.warn('Cannot resume - no failed messages to retry');
            return;
        }
        
        if (!editorEngine.network.status.isOnline) {
            console.warn('Cannot resume - still offline');
            return;
        }
        
        console.log('🔄 Resuming interrupted stream');
        setIsNetworkPaused(false);
        setCanResume(false);
        networkPauseRef.current = false;
        
        try {
            const sanitized = sanitizeMessages(lastFailedMessages);
            const result = await sendMessages(sanitized, lastChatType);
            if (result) {
                console.log('✅ Stream resumed successfully');
                setCanResume(false);
                setLastFailedMessages(null);
            } else {
                console.warn('⚠️ Resume failed - no result returned');
                setIsNetworkPaused(true);
            }
        } catch (error) {
            console.error('❌ Failed to resume stream:', error);
            setIsNetworkPaused(true);
            setCanResume(true);
            
            if (!isNetworkRelatedError(error)) {
                console.error('Non-network error during resume:', error);
            }
        }
    };
    const retryLastMessage = async () => {
        if (!lastFailedMessages) {
            console.warn('No failed messages to retry');
            return;
        }
        
        const isConnected = await editorEngine.network.checkConnection();
        if (!isConnected) {
            console.warn('Still no network connection - cannot retry');
            return;
        }
        
        console.log('🔁 Retrying last message');
        setIsNetworkPaused(false);
        setCanResume(false);
        networkPauseRef.current = false;
        
        try {
            const sanitized = sanitizeMessages(lastFailedMessages);
            const result = await sendMessages(sanitized, lastChatType);
            if (result) {
                console.log('✅ Message retry successful');
                setLastFailedMessages(null);
            } else {
                console.warn('⚠️ Retry failed - no result returned');
                setCanResume(true);
                setIsNetworkPaused(true);
            }
        } catch (error) {
            console.error('❌ Failed to retry message:', error);
            setCanResume(true);
            setIsNetworkPaused(true);
            
            if (isNetworkRelatedError(error)) {
                console.log('🌐 Network error during retry - will auto-retry when connection restored');
            } else {
                console.error('Non-network error during retry:', error);
            }
        }
    };


    const handleMaxAttemptsReached = () => {
        console.log('🚨 Max reconnect attempts reached - chat functionality limited');
       
        if (chat.isLoading) {
            setIsNetworkPaused(true);
            setCanResume(true);
            chat.stop();
        }
    };

    const contextValue:ExtendedUseChatHelpers = {
        ...chat,
        sendMessages,
        isNetworkPaused,
        canResume,
        resumeStream,
        retryLastMessage,
    }
    return <ChatContext.Provider value={contextValue}>{children}</ChatContext.Provider>;
}

export function useChatContext() {
    const context = useContext(ChatContext);
    if (!context) throw new Error('useChatContext must be used within a ChatProvider');
    const isWaiting = context.status === 'streaming' || context.status === 'submitted';
    return { ...context, isWaiting };
}

async function handleToolCall(toolCall: ToolCall<string, unknown>, editorEngine: EditorEngine) {
    try {
        const toolName = toolCall.toolName;
        if (toolName === LIST_FILES_TOOL_NAME) {
            const result = await handleListFilesTool(
                toolCall.args as z.infer<typeof LIST_FILES_TOOL_PARAMETERS>,
                editorEngine,
            );
            return result;
        } else if (toolName === READ_FILES_TOOL_NAME) {
            const result = await handleReadFilesTool(
                toolCall.args as z.infer<typeof READ_FILES_TOOL_PARAMETERS>,
                editorEngine,
            );
            return result;
        } else if (toolName === READ_STYLE_GUIDE_TOOL_NAME) {
            const result = await handleReadStyleGuideTool(editorEngine);
            return result;
        } else if (toolName === ONLOOK_INSTRUCTIONS_TOOL_NAME) {
            const result = ONLOOK_INSTRUCTIONS;
            return result;
        } else {
            throw new Error(`Unknown tool call: ${toolCall.toolName}`);
        }
    } catch (error) {
        console.error('Error handling tool call', error);
        return 'error handling tool call ' + error;
    }
}

async function handleListFilesTool(
    args: z.infer<typeof LIST_FILES_TOOL_PARAMETERS>,
    editorEngine: EditorEngine,
) {
    const result = await editorEngine.sandbox.listFiles(args.path);
    if (!result) {
        throw new Error('Error listing files');
    }
    return result;
}

async function handleReadFilesTool(
    args: z.infer<typeof READ_FILES_TOOL_PARAMETERS>,
    editorEngine: EditorEngine,
) {
    const result = await editorEngine.sandbox.readFiles(args.paths);
    if (!result) {
        throw new Error('Error reading files');
    }
    return result;
}

async function handleReadStyleGuideTool(editorEngine: EditorEngine) {
    const result = await editorEngine.theme.initializeTailwindColorContent();
    if (!result) {
        throw new Error('Style guide files not found');
    }
    return result;
}
