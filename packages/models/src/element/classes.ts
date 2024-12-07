interface ParsedClasses {
    type: 'classes';
    value: string[];
}

interface ClassParsingError {
    type: 'error';
    reason: string;
}

export type ClassParsingResult = ParsedClasses | ClassParsingError;
