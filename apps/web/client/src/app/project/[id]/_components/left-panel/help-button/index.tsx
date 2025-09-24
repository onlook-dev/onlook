'use client';

import { observer } from 'mobx-react-lite';

import { Icons } from '@onlook/ui/icons';

import { openFeedbackWidget } from '@/utils/telemetry';

export const HelpButton = observer(() => {
    return (
        <button
            aria-label="Open help"
            className="text-muted-foreground hover:text-foreground flex h-16 w-16 flex-col items-center justify-center gap-1.5 rounded-xl p-2"
            onClick={() => void openFeedbackWidget()}
        >
            <Icons.QuestionMarkCircled className="h-5 w-5" />
        </button>
    );
});
