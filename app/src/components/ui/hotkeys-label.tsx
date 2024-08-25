import { Hotkey } from '../../../common/hotkeys';
import { Kbd } from './kbd';

export function HotKeyLabel({ hotkey }: { hotkey: Hotkey }) {
    return (
        <span className="space-x-2">
            <span>{hotkey.description}</span>
            <Kbd>{hotkey.readableCommand}</Kbd>
        </span>
    );
}
