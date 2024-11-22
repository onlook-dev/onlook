import { useProjectsManager } from '@/components/Context';
import { cn } from '@onlook/ui/utils';
import '@xterm/xterm/css/xterm.css';
import { observer } from 'mobx-react-lite';
import { useEffect, useRef } from 'react';

interface TerminalProps {
    hidden?: boolean;
}

const Terminal = observer(({ hidden = false }: TerminalProps) => {
    const terminalRef = useRef<HTMLDivElement>(null);
    const projectManager = useProjectsManager();
    const runner = projectManager.runner;

    useEffect(() => {
        if (!terminalRef.current || !runner) {
            return;
        }
        runner.connectTerminalUI(terminalRef.current!);
    }, [runner]);

    return (
        <div
            className={cn(
                'bg-black transition-all duration-300',
                hidden ? 'h-0 w-0 invisible overflow-hidden' : 'h-[22rem] w-[37rem]',
            )}
        >
            {/* <div ref={terminalRef} className={cn('m-2', hidden && 'invisible')} /> */}
        </div>
    );
});

export default Terminal;
