import type { MessageContext } from '@onlook/models/chat';

import { getContextIcon, getTruncatedName } from './helpers';

export function SentContextPill({ context }: { context: MessageContext }) {
    return (
        <span
            className="flex flex-row items-center gap-0.5 text-xs select-none"
            key={context.displayName}
        >
            {getContextIcon(context)}
            <span className="truncate">{getTruncatedName(context)}</span>
        </span>
    );
}
