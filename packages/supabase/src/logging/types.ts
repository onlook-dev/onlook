export interface ErrorLogEntry {
    timestamp: string;
    userId: string;
    sessionId: string;
    source: string;
    requestType: string;
    errorMessage: string;
    errorType: string;
    errorStack: string | null;
    errorDetails: string;
    additionalInfo: Record<string, any>;
}
