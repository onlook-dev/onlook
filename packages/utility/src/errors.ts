export interface ParsedError {
    sourceId: string;
    message: string;
}

export function compareErrors(a: ParsedError, b: ParsedError): boolean {
    if (a.sourceId === b.sourceId && a.message === b.message) {
        return true;
    }
    return false;
}
