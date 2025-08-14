import type { NextPageContext } from 'next';
import Link from 'next/link';

interface ErrorProps {
    statusCode: number;
    hasGetInitialPropsRun?: boolean;
    err?: Error;
}

function Error({ statusCode, hasGetInitialPropsRun, err }: ErrorProps) {
    const getErrorMessage = (code: number) => {
        switch (code) {
            case 404:
                return 'This page could not be found';
            case 500:
                return 'Internal Server Error';
            case 403:
                return 'Access Forbidden';
            case 401:
                return 'Authentication Required';
            default:
                return 'An unexpected error has occurred';
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6 text-center">
                <div className="mb-4">
                    <h1 className="text-6xl font-bold text-gray-900 mb-2">
                        {statusCode || '?'}
                    </h1>
                    <h2 className="text-xl font-semibold text-gray-700 mb-4">
                        {getErrorMessage(statusCode)}
                    </h2>
                    <p className="text-gray-600 mb-6">
                        {statusCode
                            ? 'A server-side error occurred'
                            : 'A client-side error occurred'}
                    </p>
                </div>
                
                <div className="space-y-3">
                    <Link 
                        href="/"
                        className="inline-block w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                    >
                        Go back home
                    </Link>
                    <button 
                        onClick={() => window.location.reload()}
                        className="inline-block w-full bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors"
                    >
                        Try again
                    </button>
                </div>
                
                {process.env.NODE_ENV === 'development' && err && (
                    <details className="mt-6 text-left">
                        <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                            Error details (development only)
                        </summary>
                        <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                            {err.stack || err.message}
                        </pre>
                    </details>
                )}
            </div>
        </div>
    );
}

Error.getInitialProps = ({ res, err }: NextPageContext): ErrorProps => {
    const statusCode = res?.statusCode ?? err?.statusCode ?? 404;
    return { 
        statusCode,
        hasGetInitialPropsRun: true,
        err: err || undefined
    };
};

export default Error;
