import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { useDomainVerification } from './use-domain-verification';

export const ConfigureHeader = observer(() => {
    const [isLoading, setIsLoading] = useState(false);
    const { verifyVerificationRequest } = useDomainVerification();

    async function verifyDomain() {
        setIsLoading(true);
        await verifyVerificationRequest();
        setIsLoading(false);
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div className="space-y-2">
                    <p className="text-regularPlus text-muted-foreground">Configure</p>
                    <p className="text-small text-muted-foreground">
                        Your DNS records must be set up with these values.
                    </p>
                </div>
                <Button
                    variant="secondary"
                    size="sm"
                    className="h-8 px-3 text-sm"
                    onClick={verifyDomain}
                    disabled={isLoading}
                >
                    {isLoading && (
                        <Icons.LoadingSpinner className="h-4 w-4 animate-spin mr-2" />
                    )}
                    Verify Setup
                </Button>
            </div>
        </div>
    );
});
