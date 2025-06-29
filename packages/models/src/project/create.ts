export enum CreateRequestContextType {
    PROMPT = 'prompt',
    IMAGE = 'image',
}

type BaseCreateRequestContext = {
    type: CreateRequestContextType;
    content: string;
};

export type ImageCreateRequestContext = BaseCreateRequestContext & {
    type: CreateRequestContextType.IMAGE;
    mimeType: string;
};

export type PromptCreateRequestContext = BaseCreateRequestContext & {
    type: CreateRequestContextType.PROMPT;
};

export type CreateRequestContext = ImageCreateRequestContext | PromptCreateRequestContext;
