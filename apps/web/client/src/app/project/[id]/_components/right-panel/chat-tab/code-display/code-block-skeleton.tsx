export const CodeBlockSkeleton = () => {
    return (
        <div className="p-4 space-y-3">
            {/* Skeleton loader with animated shimmer effect */}
            <div className="space-y-2">
                <div
                    className="h-4 bg-background-secondary rounded-md animate-pulse"
                    style={{ width: '85%' }}
                />
                <div
                    className="h-4 bg-background-secondary rounded-md animate-pulse"
                    style={{ width: '70%' }}
                />
                <div
                    className="h-4 bg-background-secondary rounded-md animate-pulse"
                    style={{ width: '90%' }}
                />
                <div
                    className="h-4 bg-background-secondary rounded-md animate-pulse"
                    style={{ width: '65%' }}
                />
                <div
                    className="h-4 bg-background-secondary rounded-md animate-pulse"
                    style={{ width: '80%' }}
                />
            </div>
        </div>
    );
};
