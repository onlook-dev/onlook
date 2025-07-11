import { useEditorEngine } from '@/components/store/editor';
import { useStateManager } from '@/components/store/state';
import type { VerificationRecord } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { observer } from 'mobx-react-lite';
import { Fragment } from 'react';
import { RecordField } from './record-field';
import { useDomainVerification, VerificationState } from './use-domain-verification';

export const Verification = observer(() => {
    const editorEngine = useEditorEngine();
    const stateManager = useStateManager();
    const { domainInput, setDomainInput, customDomain, verification, verificationState, error } = useDomainVerification();

    // function validateDomain(): string | false {
    // if (!domain) {
    //     setError('Domain is required');
    //     return false;
    // }

    // try {
    //     const { isValid, error } = isApexDomain(domain);
    //     if (!isValid) {
    //         setError(error);
    //         return false;
    //     }

    //     setError(null);
    //     const url = new URL(getValidUrl(domain.trim()));
    //     const hostname = url.hostname.toLowerCase();
    //     return hostname;
    // } catch (err) {
    //     setError('Invalid domain format');
    //     return false;
    // }
    // }

    // const handleDomainVerified = () => {
    //     toast.success('Domain verified!', {
    //         description: 'Your domain is verified and ready to publish.',
    //     });

    //     setTimeout(() => {
    //         stateManager.isSettingsModalOpen = false;
    //         editorEngine.state.publishOpen = true;
    //     }, 1000);
    // };

    return (
        <div className="space-y-4">
            <NoDomainInput />
            {verificationState === VerificationState.VERIFYING && <ConfigureHeader />}
            {verificationState === VerificationState.VERIFIED && <VerifiedHeader />}
            {verificationState === VerificationState.VERIFIED && <DnsRecords />}
            {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
    );
});

export const NoDomainInput = observer(() => {
    const { domainInput, setDomainInput, customDomain, verification, verificationState, ownedDomains, createVerification } = useDomainVerification();

    function getInputButtonText() {
        switch (verificationState) {
            case VerificationState.INPUTTING_DOMAIN:
                return 'Setup';
            case VerificationState.VERIFYING:
                return 'Loading...';
            default:
                return 'Edit';
        }
    }

    async function editDomain() {
        // TODO: Implement domain edit
    }

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-start gap-2">
                <div className="w-1/3">
                    <p className="text-regularPlus text-muted-foreground">Custom URL</p>
                    <p className="text-small text-muted-foreground">
                        {`Input your domain  ${verificationState === VerificationState.INPUTTING_DOMAIN && ownedDomains.length > 0
                            ? 'or use previous'
                            : ''
                            }`}
                    </p>
                </div>
                <div className="flex flex-col gap-4 flex-1">
                    <div className="flex gap-2">
                        <Input
                            disabled={verificationState !== VerificationState.INPUTTING_DOMAIN}
                            value={domainInput}
                            onChange={(e) => setDomainInput(e.target.value)}
                            placeholder="example.com"
                            className="bg-background placeholder:text-muted-foreground"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    createVerification();
                                }
                            }}
                        />
                        <Button
                            onClick={() => {
                                if (verificationState === VerificationState.INPUTTING_DOMAIN) {
                                    createVerification();
                                } else {
                                    editDomain();
                                }
                            }}
                            variant="secondary"
                            size="sm"
                            className="h-9 text-smallPlus"
                            disabled={verificationState === VerificationState.VERIFYING}
                        >
                            {verificationState === VerificationState.VERIFYING && (
                                <Icons.LoadingSpinner className="h-4 w-4 animate-spin mr-2" />
                            )}
                            {getInputButtonText()}
                        </Button>
                    </div>
                    <ExistingDomains />
                </div>
            </div>
        </div>
    );
});

export const ExistingDomains = () => {
    const { ownedDomains, verificationState } = useDomainVerification();

    if (ownedDomains.length === 0 || verificationState !== VerificationState.INPUTTING_DOMAIN) {
        return null;
    }

    const addCustomDomain = (url: string) => {
        // createCustomDomain({
        //     domain: url,
        //     projectId: editorEngine.projectId,
        // });
        // setStatus(VerificationStatus.VERIFIED);
        // setDomain(url);
        // setError(null);
        // handleDomainVerified();
        // sendAnalytics('add custom domain success', {
        //     domain: url,
        // });
    };

    return (
        <div className="flex flex-col gap-2 flex-1">
            {ownedDomains.map((domain) => (
                <div
                    key={domain}
                    className="flex items-center text-small text-muted-foreground"
                >
                    <p>{domain}</p>
                    <Button
                        variant="outline"
                        size="sm"
                        className="ml-auto"
                        onClick={() => {
                            addCustomDomain(domain);
                        }}
                    >
                        Use Domain
                    </Button>
                </div>
            ))}
        </div>
    );
};

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

export const DnsRecords = observer(() => {
    const { verification } = useDomainVerification();

    const txtRecord = verification?.txtRecord;
    const aRecords = verification?.aRecords ?? [];
    const records: VerificationRecord[] = [txtRecord, ...aRecords].filter((record) => !!record);

    if (records.length === 0) {
        return null;
    }

    return (
        <div className="grid grid-cols-7 gap-4 rounded-lg border p-4">
            <div className="text-sm font-medium col-span-1">Type</div>
            <div className="text-sm font-medium col-span-3">Host</div>
            <div className="text-sm font-medium col-span-3">Value</div>

            {records.map((record, index) => (
                <Fragment key={`${record.type}-${record.name}-${index}`}>
                    <RecordField value={record.type} className="col-span-1" copyable={false} />
                    <RecordField value={record.name} className="col-span-3" />
                    <RecordField value={record.value} className="col-span-3" />
                </Fragment>
            ))}
        </div>
    );
});