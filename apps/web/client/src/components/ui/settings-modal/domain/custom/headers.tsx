import { Button } from '@onlook/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { observer } from 'mobx-react-lite';
import { useDomainVerification, VerificationState } from './use-domain-verification';

export const ConfigureHeader = observer(() => {
    const { verificationState } = useDomainVerification();

    async function verifyDomain() {
        // TODO: Implement domain verification

        // setStatus(VerificationStatus.LOADING);
        // setError(null);
        // const response = await verifyCustomDomain({
        //     verificationId: response.verificationId,
        //     projectId: editorEngine.projectId,
        // });

        // if (!response.success) {
        //     setError(response.message ?? 'Failed to verify domain');
        //     setStatus(VerificationStatus.VERIFYING);
        //     sendAnalytics('verify domain failed', {
        //         domain: domain,
        //         error: response.message ?? 'Failed to verify domain',
        //     });
        //     return;
        // }

        // setStatus(VerificationStatus.VERIFIED);
        // setError(null);
        // addCustomDomain(domain);
        // sendAnalytics('verify domain success', {
        //     domain: domain,
        // });
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
                    disabled={verificationState === VerificationState.VERIFYING}
                >
                    {verificationState === VerificationState.VERIFYING && (
                        <Icons.LoadingSpinner className="h-4 w-4 animate-spin mr-2" />
                    )}
                    Verify Setup
                </Button>
            </div>
        </div>
    );
});

export const VerifiedHeader = observer(() => {
    function removeDomain() {
        // TODO: Implement domain removal
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div className="space-y-2">
                    <p className="text-regularPlus text-muted-foreground">Verified</p>
                    <p className="text-small text-muted-foreground">
                        Your domain is verified and ready to use.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                        <Icons.CheckCircled className="h-4 w-4 text-green-500" />
                        <span className="text-xs text-muted-foreground">Verified</span>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <Icons.DotsVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem className="hover:bg-muted focus:bg-muted cursor-pointer hidden">
                                <Icons.Reset className="mr-2 h-4 w-4" />
                                Reconfigure DNS
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={removeDomain}
                                className="hover:bg-destructive/10 focus:bg-destructive/10 text-red-500 cursor-pointer"
                            >
                                <Icons.Trash className="mr-2 h-4 w-4" />
                                Remove Domain
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </div>
    );
});
