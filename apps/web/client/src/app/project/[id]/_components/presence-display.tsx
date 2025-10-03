'use client';

import { usePresenceManager } from '@/components/store/presence';
import { useEditorEngine } from '@/components/store/editor';
import { Avatar, AvatarFallback, AvatarImage } from '@onlook/ui/avatar';
import { Button } from '@onlook/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';

interface PresenceDisplayProps {
    className?: string;
}

export const PresenceDisplay = observer(({ className = '' }: PresenceDisplayProps) => {
    const presenceManager = usePresenceManager();
    const editorEngine = useEditorEngine();

    useEffect(() => {
        if (editorEngine.user && editorEngine.projectId) {
            presenceManager.setContext(editorEngine.user.id, editorEngine.projectId);
        }
    }, [editorEngine.user?.id, editorEngine.projectId, presenceManager]);

    if (!presenceManager.isConnected || presenceManager.otherOnlineUsers.length === 0) {
        return null;
    }

    const onlineUsers = presenceManager.otherOnlineUsers;

    return (
        <div className={`flex items-center gap-1 ${className}`}>
            {onlineUsers.slice(0, 3).map((user) => (
                <Tooltip key={user.userId}>
                    <TooltipTrigger asChild>
                        <div className="relative">
                            <Avatar className="h-6 w-6 border-2 border-background-primary">
                                <AvatarImage src={user.avatarUrl || undefined} alt={user.displayName} />
                                <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                                    {user.displayName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-background-primary" />
                        </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="mt-1" hideArrow>
                        <p className="text-sm">{user.displayName} is online</p>
                    </TooltipContent>
                </Tooltip>
            ))}

            {onlineUsers.length > 3 && (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-6 w-6 rounded-full p-0 text-xs bg-muted hover:bg-muted/80"
                        >
                            +{onlineUsers.length - 3}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="mt-1" hideArrow>
                        <div className="text-sm">
                            {onlineUsers.slice(3).map(user => (
                                <div key={user.userId}>{user.displayName}</div>
                            ))}
                        </div>
                    </TooltipContent>
                </Tooltip>
            )}
        </div>
    );
});
