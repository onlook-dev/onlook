import { Progress } from '@onlook/ui/progress';

export const LoadingState = ({ message, progress }: { message: string, progress: number }) => {
    return (
        <div className="p-4 flex flex-col gap-2">
            <p>{message}</p>
            <Progress value={progress} className="w-full" />
        </div>
    );
};
