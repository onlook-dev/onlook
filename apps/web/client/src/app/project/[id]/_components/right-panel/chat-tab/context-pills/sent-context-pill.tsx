import { type ChatMessageContext } from '@onlook/models/chat';
import { getContextIcon, getTruncatedName } from './helpers';

export function SentContextPill({ context }: { context: ChatMessageContext }) {
    return (
        <span
            className="flex flex-row gap-0.5 text-xs items-center select-none"
            key={context.type === 'mention' ? `mention-${context.path}-${context.displayName}` : context.displayName}
        >
            {getContextIcon(context)}
            <span className="truncate">{getTruncatedName(context)}</span>
        </span>
    );
}
