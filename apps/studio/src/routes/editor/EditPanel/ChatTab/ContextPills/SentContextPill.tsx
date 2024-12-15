import { type ChatMessageContext } from '@onlook/models/chat';
import { getContextIcon, getTruncatedName } from './helpers';

export function SentContextPill({ context }: { context: ChatMessageContext }) {
    return (
        <span className="flex flex-row gap-1 items-center" key={context.displayName}>
            {getContextIcon(context)}
            <span>{getTruncatedName(context)}</span>
        </span>
    );
}
