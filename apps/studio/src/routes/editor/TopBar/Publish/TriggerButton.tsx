import { useEditorEngine, useProjectsManager } from '@/components/Context';
import { PublishStatus } from '@onlook/models/hosting';
import { Button } from '@onlook/ui/button';
import { DropdownMenuTrigger } from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons/index';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';

export const PublishButton = observer(() => {
    const editorEngine = useEditorEngine();
    const projectsManager = useProjectsManager();
    const baseStatus = projectsManager.domains?.base?.state.status;
    const customStatus = projectsManager.domains?.custom?.state.status;

    const computeStatus = () => {
        if (!baseStatus && !customStatus) {
            return PublishStatus.UNPUBLISHED;
        }

        if (baseStatus === PublishStatus.ERROR || customStatus === PublishStatus.ERROR) {
            return PublishStatus.ERROR;
        }

        if (baseStatus === PublishStatus.LOADING || customStatus === PublishStatus.LOADING) {
            return PublishStatus.LOADING;
        }

        if (baseStatus === PublishStatus.PUBLISHED || customStatus === PublishStatus.PUBLISHED) {
            return PublishStatus.PUBLISHED;
        }

        return PublishStatus.UNPUBLISHED;
    };

    const status: PublishStatus = computeStatus();

    let colorClasses = 'border-input bg-background hover:bg-background-onlook text-foreground';
    let icon: React.ReactNode | null = <Icons.Globe className="mr-2 h-4 w-4" />;
    let text = 'Publish';

    if (status === PublishStatus.PUBLISHED) {
        colorClasses =
            'border-teal-300 bg-teal-400/90 hover:bg-teal-400 dark:border-teal-300 dark:bg-teal-700 dark:hover:bg-teal-500/20 dark:text-teal-100 text-white hover:text-background';
        text = editorEngine.history.length > 0 ? 'Update' : 'Live';
        icon = <Icons.Globe className="mr-2 h-4 w-4" />;
    } else if (status === PublishStatus.LOADING) {
        icon = <Icons.Shadow className="mr-2 h-4 w-4 animate-spin" />;
        text = 'Publishing';
    } else if (status === PublishStatus.UNPUBLISHED) {
        colorClasses = 'border-input bg-background hover:bg-background-onlook text-foreground';
    } else if (status === PublishStatus.ERROR) {
        colorClasses =
            'border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-600 hover:border-red-500';
        icon = <Icons.ExclamationTriangle className="mr-2 h-4 w-4" />;
    }

    return (
        <DropdownMenuTrigger asChild>
            <Button
                variant="outline"
                size="sm"
                className={cn(
                    'px-3 flex items-center border-[0.5px] text-xs justify-center shadow-sm h-8 rounded-md transition-all duration-300 ease-in-out',
                    colorClasses,
                )}
            >
                {icon}
                {text}
            </Button>
        </DropdownMenuTrigger>
    );
});
