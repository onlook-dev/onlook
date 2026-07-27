import { Card, CardContent } from '@onlook/ui/card';
import { Skeleton } from '@onlook/ui/skeleton';

export default function Loading() {
    return (
        <Card className="bg-background/30 min-h-[12rem] w-[30rem] overflow-hidden backdrop-blur-md">
            <CardContent className="space-y-6 p-6">
                <div className="flex flex-col gap-2">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-64" />
                </div>

                <Skeleton className="h-10 w-full" />

                <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div
                            key={i}
                            className="border-border flex items-start gap-3 rounded-lg border p-3"
                        >
                            <Skeleton className="h-10 w-10 rounded" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-3 w-full" />
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
