import { useProjectsManager } from '@/components/Context';
import { Button } from '@onlook/ui/button';
import { toast } from '@onlook/ui/use-toast';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';

const DangerZone = observer(() => {
    const projectsManager = useProjectsManager();
    const [isUnpublishing, setIsUnpublishing] = useState(false);
    const baseDomain = projectsManager.domains?.base;

    const unpublishProject = async () => {
        if (!baseDomain) {
            console.error('No base domain found');
            return;
        }
        setIsUnpublishing(true);
        const success = await baseDomain.unpublish();
        setIsUnpublishing(false);
        if (!success) {
            toast({
                title: 'Failed to unpublish project',
                description: 'Please try again.',
                variant: 'destructive',
            });
        } else {
            toast({
                title: 'Project unpublished',
                description: 'Your project is no longer publicly accessible.',
            });
        }
    };

    return (
        <div className="flex flex-col gap-4">
            <h2 className="text-lg font-medium">Danger Zone</h2>
            <div className="flex flex-col gap-2">
                <div className="flex flex-row gap-2 items-center">
                    <p className="text-sm text-muted-foreground">
                        {!baseDomain
                            ? 'Your domain is not published'
                            : 'Unpublish your project to stop it from being publicly accessible.'}
                    </p>
                    <Button
                        onClick={unpublishProject}
                        className="ml-auto"
                        size="sm"
                        variant="destructive"
                        disabled={isUnpublishing || !baseDomain}
                    >
                        {isUnpublishing ? 'Unpublishing...' : 'Unpublish'}
                    </Button>
                </div>
            </div>
        </div>
    );
});

export default DangerZone;
