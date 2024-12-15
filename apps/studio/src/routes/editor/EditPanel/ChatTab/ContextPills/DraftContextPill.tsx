import { type ChatMessageContext } from '@onlook/models/chat';
import { Icons } from '@onlook/ui/icons/index';
import { getContextIcon, getTruncatedName } from './helpers';

export function DraftContextPill({
    context,
    onRemove,
}: {
    context: ChatMessageContext;
    onRemove: () => void;
}) {
    return (
        <span
            className="group flex flex-row items-center gap-1 justify-center border bg-background-tertiary p-1 rounded-md"
            key={context.displayName}
        >
            <div className="w-4 flex text-center items-center justify-center">
                {getContextIcon(context)}
            </div>
            <span className="text-xs">{getTruncatedName(context)}</span>
            <button
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onRemove();
                }}
                className="h-6 w-0 group-hover:w-4 flex items-center justify-center cursor-pointer transition-width duration-200"
            >
                <Icons.CrossL className="w-0 h-0 text-foreground group-hover:w-2.5 group-hover:h-2.5 transition-width duration-200" />
            </button>
        </span>
    );
}
