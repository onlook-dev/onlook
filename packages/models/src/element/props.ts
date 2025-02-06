interface ParsedProps {
    type: 'props';
    props: NodeProps[];
}

export interface NodeProps {
    key: any;
    value: any;
    type: any;
}

interface PropsParsingError {
    type: 'error';
    reason: string;
}

export type PropsParsingResult = ParsedProps | PropsParsingError;
