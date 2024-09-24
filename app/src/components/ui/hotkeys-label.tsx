import { Hotkey } from '../../../common/hotkeys';
import { Kbd } from './kbd';

export function HotKeyLabel({ hotkey }: { hotkey: Hotkey }) {
    return (
        <span className="flex items-center space-x-2">
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
