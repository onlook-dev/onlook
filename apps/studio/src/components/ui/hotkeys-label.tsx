import { Kbd } from '@onlook/ui/kbd';
import { cn } from '@onlook/ui/utils';
import type { Hotkey } from '/common/hotkeys';

export function HotKeyLabel({ hotkey, className }: { hotkey: Hotkey; className?: string }) {
    return (
        <span className={cn('flex items-center space-x-2', className)}>
            <span>{hotkey.description}</span>

            <Kbd>
                <span
                    className="inline-grid grid-flow-col auto-cols-max gap-1.5 items-center text-xs [&_kbd]:text-[1.1em]"
                    dangerouslySetInnerHTML={{ __html: hotkey.readableCommand }}
                />
            </Kbd>
        </span>
    );
}
