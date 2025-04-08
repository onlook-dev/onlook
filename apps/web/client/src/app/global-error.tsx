'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center p-4">
          <div className="text-center space-y-6">
            <h1 className="text-6xl font-bold">500</h1>
            <h2 className="text-2xl font-semibold">Something went wrong</h2>
            <p className="max-w-md mx-auto">
              An unexpected error occurred. We've been notified and are working to fix it.
            </p>
            <button
              onClick={() => reset()}
              className="px-4 py-2 border rounded-md"
            >
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
