'use client';

import { ResizablePanel } from '@onlook/ui/resizable';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { CodeTab } from '../right-panel/code-tab';

export const CodePanel = observer(() => {
    return (
        <div
            className={cn(
                'flex h-full w-full transition-width duration-300 bg-background/95 group/panel border-[0.5px] backdrop-blur-xl shadow rounded-tr-xl',
            )}
        >
            <ResizablePanel
                side="left"
                defaultWidth={700}
                minWidth={400}
                maxWidth={1200}
            >
                <div className="h-full">
                    <CodeTab />
                </div>
            </ResizablePanel>
        </div>
    );
});