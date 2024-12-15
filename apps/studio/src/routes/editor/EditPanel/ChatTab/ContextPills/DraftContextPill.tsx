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
            className="group relative flex flex-row items-center gap-1 justify-center border bg-background-tertiary py-0.5 px-1 rounded-md"
            key={context.displayName}
        >
            <div className="w-4 flex text-center items-center justify-center">
                <div className="group-hover:opacity-0 transition-opacity duration-200">
                    {getContextIcon(context)}
                </div>
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onRemove();
                    }}
                    className="absolute top-0 bottom-0 left-[2px] w-4 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                >
                    <Icons.CrossL className="w-2.5 h-2.5 text-foreground group-hover:text-foreground-active" />
                </button>
            </div>
            <span className="text-xs">{getTruncatedName(context)}</span>
        </span>
    );
}
