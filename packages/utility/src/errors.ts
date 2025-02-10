export interface ParsedError {
    sourceId: string;
    content: string;
}

export function compareErrors(a: ParsedError, b: ParsedError): boolean {
    if (a.sourceId === b.sourceId && a.content === b.content) {
        return true;
    }
    return false;
}
