import React from 'react';
import { Hotkeys } from '../../../common/hotkeys';
import { Kbd } from './kbd';

export function HotKeysLabel({ hotkey }: { hotkey: Hotkeys }) {
    return (
        <span className="space-x-2">
            <span>{hotkey.description}</span>
            <Kbd>{hotkey.readableCommand}</Kbd>
        </span>
    );
}
