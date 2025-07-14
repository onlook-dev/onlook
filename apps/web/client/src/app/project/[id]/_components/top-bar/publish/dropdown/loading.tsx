import { Progress } from '@onlook/ui/progress';

export const LoadingState = ({ type, message, progress }: { type: 'preview' | 'custom', message: string, progress: number }) => {
    return (
        <div className="p-4 flex flex-col gap-2">
            <p className="text-foreground-primary">{type === 'preview' ? 'Preview' : 'Custom'} domain</p>
            <p className="text-foreground-secondary">{message}</p>
            <Progress value={progress} className="w-full" />
        </div>
    );
};
