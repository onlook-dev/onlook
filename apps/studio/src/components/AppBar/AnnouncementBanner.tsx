import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { useEditorEngine } from '../Context';

enum Variant {
    INFO = 'info',
    WARNING = 'warning',
    SUCCESS = 'success',
}

export const AnnouncementBanner = observer(({ variant = Variant.INFO }: { variant?: Variant }) => {
    const MESSAGE = 'Onlook is moving to the web';
    const editorEngine = useEditorEngine();

    return (
        <div
            className={cn(
                'w-full h-full flex flex-row items-center justify-center transition-colors duration-300 ease-in-out',
            )}
        >
            <div className="flex flex-row items-center gap-2 text-sm">
                <span className="flex-1">{MESSAGE}</span>
                <span>•</span>
                <button
                    onClick={() => {
                        editorEngine.isAnnouncementOpen = true;
                    }}
                    className="no-drag underline hover:text-blue-300"
                >
                    Learn more
                </button>
            </div>
        </div>
    );
});
