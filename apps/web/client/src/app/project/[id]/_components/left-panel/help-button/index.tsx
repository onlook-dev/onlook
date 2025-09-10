'use client';

import { openFeedbackWidget } from '@/utils/telemetry';
import { Icons } from '@onlook/ui/icons';
import { observer } from 'mobx-react-lite';

export const HelpButton = observer(() => {
    return (
        <button
            aria-label="Open help"
            className="w-16 h-16 rounded-xl flex flex-col items-center justify-center gap-1.5 p-2 text-muted-foreground hover:text-foreground"
            onClick={() => void openFeedbackWidget()}
        >
            <Icons.QuestionMarkCircled className="w-5 h-5" />
        </button>
    );
});

