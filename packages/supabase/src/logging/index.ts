import supabaseClient from '../clients';
import type { ErrorLogEntry } from './types';
import { nanoid } from 'nanoid/non-secure';

export class ErrorLogger {
    private static instance: ErrorLogger;

    private constructor() {}

    public static getInstance(): ErrorLogger {
        if (!ErrorLogger.instance) {
            ErrorLogger.instance = new ErrorLogger();
        }
        return ErrorLogger.instance;
    }

    public async logError(
        error: unknown,
        context: {
            userId?: string;
            sessionId?: string;
            requestType?: string;
            source: string;
            additionalInfo?: Record<string, any>;
        },
    ): Promise<void> {
        try {
            const supabase = supabaseClient;
            if (!supabase) {
                console.error('Supabase client not available for error logging');
                return;
            }

            const errorEntry: ErrorLogEntry = {
                timestamp: new Date().toISOString(),
                userId: context.userId || 'unknown',
                sessionId: context.sessionId || nanoid(),
                source: context.source,
                requestType: context.requestType || 'unknown',
                errorMessage: this.extractErrorMessage(error),
                errorType: this.getErrorType(error),
                errorStack: this.extractErrorStack(error),
                errorDetails: this.serializeError(error),
                additionalInfo: context.additionalInfo || {},
            };

            const { error: insertError } = await supabase.from('error_logs').insert(errorEntry);

            if (insertError) {
                console.error('Failed to log error to Supabase:', insertError);
            }
        } catch (loggingError) {
            console.error('Error during error logging:', loggingError);
        }
    }

    private extractErrorMessage(error: unknown): string {
        if (error instanceof Error) {
            return error.message;
        }
        if (typeof error === 'string') {
            return error;
        }
        if (error && typeof error === 'object') {
            if ('message' in error) {
                return String((error as any).message);
            }
            if ('error' in error && typeof (error as any).error === 'object') {
                if ('responseBody' in (error as any).error) {
                    try {
                        const parsed = JSON.parse((error as any).error.responseBody);
                        return parsed.error?.message || String((error as any).error.responseBody);
                    } catch {
                        return String((error as any).error.responseBody);
                    }
                }
            }
        }
        return 'Unknown error';
    }

    private getErrorType(error: unknown): string {
        if (error instanceof Error) {
            return error.constructor.name;
        }
        if (error && typeof error === 'object') {
            if ('error' in error && typeof (error as any).error === 'object') {
                if ('statusCode' in (error as any).error) {
                    return `HTTPError${(error as any).error.statusCode}`;
                }
                if ('type' in (error as any).error) {
                    return String((error as any).error.type);
                }
            }
        }
        return typeof error;
    }

    private extractErrorStack(error: unknown): string | null {
        if (error instanceof Error) {
            return error.stack || null;
        }
        return null;
    }

    private serializeError(error: unknown): string {
        try {
            if (error instanceof Error) {
                const serialized: Record<string, any> = {};
                Object.getOwnPropertyNames(error).forEach((prop) => {
                    serialized[prop] = (error as any)[prop];
                });
                return JSON.stringify(serialized);
            }
            return JSON.stringify(error);
        } catch {
            return 'Error could not be serialized';
        }
    }
}

export default ErrorLogger.getInstance();
