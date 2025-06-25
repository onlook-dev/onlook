import { Icons } from '@onlook/ui/icons';
import Link from 'next/link';

export default function NotFound() {
    return (
        <main className="flex flex-1 flex-col items-center justify-center p-4 text-center">
            <div className="max-w-md space-y-6">
                <div className="space-y-2">
                    <h1 className="text-4xl font-bold tracking-tight">404</h1>
                    <h2 className="text-2xl font-semibold tracking-tight">Page not found</h2>
                    <p className="text-muted-foreground">
                        {`The page you're looking for doesn't exist or has been moved.`}
                    </p>
                </div>

                <div className="flex justify-center">
                    <Link
                        href="/docs"
                        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                        <Icons.ArrowLeft className="h-4 w-4" />
                        Back to documentation
                    </Link>
                </div>
            </div>
        </main>
    );
}
