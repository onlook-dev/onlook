import { useStateManager } from '@/components/store/state';
import type { Usage } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { observer } from 'mobx-react-lite';

interface ErrorMessageProps {
    error: Error;
}

export const ErrorMessage = observer(({ error: chatError }: ErrorMessageProps) => {
    const stateManager = useStateManager();

    // Parse error to extract usage and message
    let usage: Usage | null = null;
    let errorMessage: string | null = null;

    try {
        const parsed = JSON.parse(chatError.message) as {
            code: number;
            error: string;
            usage: Usage;
        };
        if (parsed && typeof parsed === 'object') {
            if (parsed.code === 402 && parsed.usage) {
                usage = parsed.usage;
                errorMessage = parsed.error || 'Message limit exceeded.';
            } else {
                errorMessage = parsed.error || chatError.toString();
            }
        }
    } catch (e) {
        // Not JSON, use raw error message
        errorMessage = chatError.message || chatError.toString();
    }

    if (usage) {
        return (
            <div className="flex w-full flex-col items-center justify-center gap-2 text-small px-4 pb-4">
                <p className="text-foreground-secondary text-mini my-1 text-blue-300 select-none">
                    You reached your {usage.limitCount} {usage.period === 'day' ? 'daily' : 'monthly'} message limit.
                </p>
                <Button
                    className="w-full mx-10 bg-blue-500 text-white border-blue-400 hover:border-blue-200/80 hover:text-white hover:bg-blue-400 shadow-blue-500/50 hover:shadow-blue-500/70 shadow-lg transition-all duration-300"
                    onClick={() => (stateManager.isSubscriptionModalOpen = true)}
                >
                    Get more {usage.period === 'day' ? 'daily' : 'monthly'} messages
                </Button>
            </div>
        );
    }

    if (errorMessage) {
        return (
            <div className="flex w-full flex-row items-center justify-center gap-2 p-2 text-small text-red">
                <Icons.ExclamationTriangle className="w-6" />
                <p className="w-5/6 text-wrap overflow-auto">{errorMessage}</p>
            </div>
        );
    }

    return null;
});
