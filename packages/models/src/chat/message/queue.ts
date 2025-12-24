import type { ChatType } from '../type';
import type { MessageContext } from './context';

export interface QueuedMessage {
    id: string;
    content: string;
    type: ChatType;
    timestamp: Date;
    context: MessageContext[];
}
