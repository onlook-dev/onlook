interface TextContent {
    type: 'text';
    text: string;
}

export type ChatContent = TextContent;

export enum ChatRole {
    USER = 'user',
    ASSISTANT = 'assistant',
}
