import { useChatContext } from '@/app/project/[id]/_hooks/use-chat';
import { useEditorEngine } from '@/components/store/editor';
import { Icons } from '@onlook/ui/icons/index';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';

export const NetworkWarning = observer(() => {
    const { isNetworkPaused, canResume, resumeStream, retryLastMessage } = useChatContext();
    const editorEngine = useEditorEngine();
    const [isVisible, setIsVisible] = useState(false);
    const [showRetryButton, setShowRetryButton] = useState(false);

    
    const maxAttemptsReached = editorEngine.network.status.reconnectAttempts >= editorEngine.network.status.maxReconnectAttempts && !editorEngine.network.status.isOnline;
    const isOffline = !editorEngine.network.status.isOnline;
    const isReconnecting = editorEngine.network.status.isConnecting;

  
    const shouldShowWarning = isNetworkPaused || isOffline || isReconnecting || maxAttemptsReached;
    


    
    useEffect(() => {
        if (shouldShowWarning) {
            setIsVisible(true);

            const timer = maxAttemptsReached
                ? setTimeout(() => setShowRetryButton(true), 500)
                : null;

            // Always provide a cleanup so the timeout is cleared if the
            // component unmounts while the banner is still visible.
            return () => {
                if (timer) clearTimeout(timer);
            };
        } else {
            setIsVisible(false);
            setShowRetryButton(false);
        }
    }, [shouldShowWarning, maxAttemptsReached]);

    if (!shouldShowWarning && !isVisible) {
        return null;
    }

    
    const getWarningConfig = () => {
        if (maxAttemptsReached) {
            return {
                message: "Connection lost - unable to reconnect automatically",
                subMessage: "Click 'Try Again' to retry or check your internet connection",
                icon: Icons.CrossCircled,
                bgColor: "bg-red-50 border-red-200",
                textColor: "text-red-700",
                iconColor: "text-red-500"
            };
        }
        
        if (isReconnecting) {
            return {
                message: "Connection lost, attempting to reconnect...",
                subMessage: `Attempt ${editorEngine.network.status.reconnectAttempts}/${editorEngine.network.status.maxReconnectAttempts}`,
                icon: Icons.Reload,
                bgColor: "bg-orange-50 border-orange-200",
                textColor: "text-orange-700",
                iconColor: "text-orange-500"
            };
        }
        
        if (isOffline || isNetworkPaused) {
            return {
                message: "Connection lost, attempting to reconnect...",
                subMessage: isNetworkPaused 
                    ? "Your chat will automatically resume when connection is restored"
                    : "Check your internet connection. Any new chat will wait for connectivity.",
                icon: Icons.ExclamationTriangle,
                bgColor: "bg-yellow-50 border-yellow-200",
                textColor: "text-yellow-700",
                iconColor: "text-yellow-500"
            };
        }

        return null;
    };

    const config = getWarningConfig();
    if (!config) return null;

    const IconComponent = config.icon;

    return (
        <div 
            className={cn(
                "mx-4 my-3 p-4 rounded-lg border transition-all duration-300 ease-in-out",
                config.bgColor,
                isVisible ? "opacity-100 transform translate-y-0" : "opacity-0 transform -translate-y-2"
            )}
        >
            {/* Warning Message */}
            <div className="flex items-start gap-3">
                <IconComponent 
                    className={cn(
                        "h-5 w-5 mt-0.5 flex-shrink-0",
                        config.iconColor,
                        isReconnecting && "animate-spin"
                    )}
                />
                <div className="flex-1 space-y-1">
                    <p className={cn("text-sm font-medium", config.textColor)}>
                        {config.message}
                    </p>
                    <p className={cn("text-xs opacity-80", config.textColor)}>
                        {config.subMessage}
                    </p>
                </div>
            </div>

            {/* Action Buttons - Only show after max attempts */}
            {maxAttemptsReached && showRetryButton && (
                <div 
                    className={cn(
                        "mt-3 flex gap-2 transition-all duration-300 ease-in-out",
                        showRetryButton ? "opacity-100 transform translate-y-0" : "opacity-0 transform translate-y-2"
                    )}
                >
                    {/* Network Retry Button */}
                    <button
                        onClick={() => {
                            editorEngine.network.manualRetry();
                        }}
                        className="px-3 py-1.5 text-xs font-medium bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors duration-200 flex items-center gap-1"
                    >
                        <Icons.Reload className="h-3 w-3" />
                        Try Again
                    </button>

                    {/* Chat Resume Button (if chat was paused) */}
                    {canResume && (
                        <button
                            onClick={async () => {
                                await retryLastMessage();
                            }}
                            className="px-3 py-1.5 text-xs font-medium bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors duration-200 flex items-center gap-1"
                        >
                            <Icons.ChatBubble className="h-3 w-3" />
                            Retry Chat
                        </button>
                    )}
                </div>
            )}

            {/* Automatic Resume Indicator */}
            {isNetworkPaused && !maxAttemptsReached && (
                <div className="mt-2 flex items-center gap-2">
                    <div className="h-1 w-1 bg-current rounded-full animate-pulse" />
                    <p className={cn("text-xs opacity-60", config.textColor)}>
                        Waiting for connection to resume chat...
                    </p>
                </div>
            )}
        </div>
    );
}); 