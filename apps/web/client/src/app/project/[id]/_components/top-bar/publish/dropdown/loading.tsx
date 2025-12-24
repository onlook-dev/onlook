import { useHostingType } from '@/components/store/hosting/type';
import { DeploymentType } from '@onlook/models/hosting';
import { Button } from '@onlook/ui/button';
import { Progress } from '@onlook/ui/progress';
import { useState } from 'react';

export const LoadingState = ({ type }: { type: DeploymentType }) => {
    const [isLoading, setIsLoading] = useState(false);
    const { deployment, cancel } = useHostingType(type);

    const handleCancel = async () => {
        setIsLoading(true);
        await cancel();
        setIsLoading(false);
    };

    return (
        <div className="p-4 flex flex-col gap-2">
            <p className="text-foreground-primary">{type === 'preview' ? 'Base' : 'Custom'} domain</p>
            <p className="text-foreground-secondary">{deployment?.message}</p>
            <Progress value={deployment?.progress ?? 0} className="w-full" />
            <div className="flex mt-2 justify-end gap-2">
                <Button variant="outline" size="sm" onClick={handleCancel} disabled={isLoading}>
                    Cancel
                </Button>
            </div>
        </div>
    );
};
