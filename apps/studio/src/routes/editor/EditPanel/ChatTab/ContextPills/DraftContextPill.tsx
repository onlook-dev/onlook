import { type ChatMessageContext } from '@onlook/models/chat';
import { Icons } from '@onlook/ui/icons/index';
import { getContextIcon, getTruncatedName } from './helpers';

export function DraftContextPill({ context }: { context: ChatMessageContext }) {
    return (
        <span
            className="group flex flex-row items-center gap-1 justify-center border bg-background-tertiary px-1 py-0.5 rounded-md"
            key={context.displayName}
        >
            <div className="w-4 flex text-center items-center justify-center">
                {getContextIcon(context)}
            </div>
            <span className="text-xs">{getTruncatedName(context)}</span>
            <Icons.CrossL className="ml-1 w-0 h-0 text-foreground group-hover:w-2.5 group-hover:h-2.5 transition-width duration-200" />
        </span>
    );
}
