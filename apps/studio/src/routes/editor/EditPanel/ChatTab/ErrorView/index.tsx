import { useEditorEngine } from '@/components/Context';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';

export const ErrorView = observer(() => {
    const editorEngine = useEditorEngine();
    const [isOpen, setIsOpen] = useState(false);

    const errorCount = editorEngine.errors.errors.reduce(
        (count, errorGroup) => count + errorGroup.filter((e) => e.type !== 'UNKNOWN').length,
        0,
    );

    if (errorCount === 0) {
        return null;
    }

    return (
        <div className="flex flex-col mx-2 bg-yellow-950/80 border border-yellow-500/20 hover:bg-yellow-950/90 rounded-lg">
            <div
                className="flex w-full p-4 text-sm text-yellow-500 cursor-pointer"
                onClick={() => errorCount > 1 && setIsOpen(!isOpen)}
            >
                <div className="text-start font-semibold flex-1 min-w-0">
                    <div className="truncate">
                        {errorCount === 1 ? 'Error' : `Errors (${errorCount})`}
                    </div>
                    <div className="font-normal text-yellow-500/80 truncate">
                        {errorCount === 1
                            ? editorEngine.errors.errors.flat().find((e) => e.type !== 'UNKNOWN')
                                  ?.message
                            : `You have ${errorCount} errors`}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-yellow-500 hover:text-yellow-400 hover:bg-yellow-500/10"
                        onClick={(e) => {
                            e.stopPropagation();
                            window.open('https://example.com', '_blank');
                        }}
                    >
                        <Icons.ExternalLink className="h-4 w-4" />
                    </Button>

                    {errorCount > 1 && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                                'h-6 w-6 text-yellow-500 hover:text-yellow-400 hover:bg-yellow-500/10',
                                isOpen && 'rotate-180',
                            )}
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsOpen(!isOpen);
                            }}
                        >
                            <Icons.RowSpacing className="h-4 w-4" />
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-yellow-500 hover:text-yellow-400 hover:bg-yellow-500/10"
                        onClick={(e) => {
                            e.stopPropagation();
                            const error = editorEngine.errors.errors
                                .flat()
                                .find((e) => e.type !== 'UNKNOWN');
                            if (error) {
                                editorEngine.chat.sendFixErrorToAi(error);
                            }
                        }}
                    >
                        <Icons.MagicWand className="h-4 w-4" />
                    </Button>
                </div>
            </div>
            {isOpen && errorCount > 1 && (
                <div className="px-4 pb-4 truncate">
                    {editorEngine.errors.errors.map((errorGroup, groupIndex) => {
                        const filteredErrors = errorGroup.filter((e) => e.type !== 'UNKNOWN');
                        return filteredErrors.map((e) => (
                            <div key={e.message} className="mb-4">
                                <div className="text-sm font-medium text-yellow-500">{e.type}</div>
                                <div className="text-sm text-yellow-500/80">{e.message}</div>
                            </div>
                        ));
                    })}
                </div>
            )}
        </div>
    );
});
