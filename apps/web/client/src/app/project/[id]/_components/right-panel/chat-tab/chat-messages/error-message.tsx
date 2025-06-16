import { useEditorEngine } from '@/components/store/editor';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { observer } from 'mobx-react-lite';

export const ErrorMessage = observer(() => {
    const editorEngine = useEditorEngine();
    const error = editorEngine.chat.error.message;
    const messageLimitCheckResult = editorEngine.chat.error.limitInfo;

    if (messageLimitCheckResult) {
        const requestLimit =
            messageLimitCheckResult.period === 'daily'
                ? messageLimitCheckResult.limit
                : messageLimitCheckResult.limit;

        return (
            <div className="flex w-full flex-col items-center justify-center gap-2 text-small px-4 pb-4">
                <p className="text-foreground-secondary text-mini my-1 text-blue-300 select-none">
                    You reached your {messageLimitCheckResult.period} {requestLimit} message limit.
                </p>
                <Button
                    className="w-full mx-10 bg-blue-500 text-white border-blue-400 hover:border-blue-200/80 hover:text-white hover:bg-blue-400 shadow-blue-500/50 hover:shadow-blue-500/70 shadow-lg transition-all duration-300"
                    onClick={() => (editorEngine.state.plansOpen = true)}
                >
                    Get more {messageLimitCheckResult.period} messages
                </Button>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex w-full flex-row items-center justify-center gap-2 p-2 text-small text-red">
                <Icons.ExclamationTriangle className="w-6" />
                <p className="w-5/6 text-wrap overflow-auto">{error}</p>
            </div>
        );
    }
    return null;
});
