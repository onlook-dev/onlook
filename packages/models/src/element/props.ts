interface ParsedProps {
    type: 'props';
    props: NodeProps[];
}

export enum PropsType {
    String = 'string',
    Number = 'number',
    Boolean = 'boolean',
    Object = 'object',
    Array = 'array',
    Code = 'code',
}

export interface NodeProps {
    key: any;
    value: any;
    type: PropsType;
}

interface PropsParsingError {
    type: 'error';
    reason: string;
}

export type PropsParsingResult = ParsedProps | PropsParsingError;
