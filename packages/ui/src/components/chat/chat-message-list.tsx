import * as React from 'react';
import { cn } from '../../utils';
import { Button } from '../button';
import { Icons } from '../icons';
import { useAutoScroll } from './hooks/use-auto-scroll';

interface ChatMessageListProps extends React.HTMLAttributes<HTMLDivElement> {
    smooth?: boolean;
    contentKey: string;
}

const ChatMessageList = React.forwardRef<HTMLDivElement, ChatMessageListProps>(
    ({ className, children, smooth = true, contentKey, ...props }, _ref) => {
        const { scrollRef, isAtBottom, autoScrollEnabled, scrollToBottom, disableAutoScroll } =
            useAutoScroll({
                smooth,
                content: children,
                contentKey,
            });

        return (
            <div className="relative h-full">
                <div
                    className={cn('flex flex-col w-full h-full overflow-y-auto', className)}
                    ref={scrollRef}
                    onWheel={disableAutoScroll}
                    onTouchMove={disableAutoScroll}
                    {...props}
                >
                    <div className="flex flex-col gap-2">{children}</div>
                </div>

                {!isAtBottom && (
                    <Button
                        onClick={() => {
                            scrollToBottom();
                        }}
                        size="icon"
                        variant="outline"
                        className="absolute dark:bg-background bottom-2 left-1/2 transform -translate-x-1/2 inline-flex rounded-full"
                        aria-label="Scroll to bottom"
                    >
                        <Icons.ArrowDown className="h-4 w-4" />
                    </Button>
                )}
            </div>
        );
    },
);

ChatMessageList.displayName = 'ChatMessageList';

export { ChatMessageList };
