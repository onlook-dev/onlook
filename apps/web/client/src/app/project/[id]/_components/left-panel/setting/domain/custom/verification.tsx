import { Button } from '@onlook/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { getValidUrl, isApexDomain } from '@onlook/utility';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';

import { useEditorEngine } from '@/components/store/editor';
import { useDomainsManager, useProjectManager } from '@/components/store/project';
import { FREESTYLE_IP_ADDRESS, FRESTYLE_CUSTOM_HOSTNAME } from '@onlook/constants';
import { RecordField } from './record-field';
import { api } from '@/trpc/client';
import { toast } from '@onlook/ui/sonner';
import { sendAnalytics } from '@/utils/analytics';

enum VerificationStatus {
    NO_DOMAIN = 'no_domain',
    VERIFYING = 'verifying',
    VERIFIED = 'verified',
    LOADING = 'loading',
}

interface DNSRecord {
    type: 'A' | 'CNAME' | 'TXT';
    host: string;
    value: string;
}

export const Verification = observer(() => {
    const editorEngine = useEditorEngine();
    const domainsManager = useDomainsManager();
    const projectManager = useProjectManager();

    const [status, setStatus] = useState(VerificationStatus.NO_DOMAIN);
    const [domain, setDomain] = useState('');
    const [records, setRecords] = useState<DNSRecord[]>([]);
    const [error, setError] = useState<string | null>();
    const [ownedDomains, setOwnedDomains] = useState<string[]>([]);

    // useEffect(() => {
    //     if (domainsManager) {
    //         domainsManager.getOwnedDomains().then((domains) => {
    //             setOwnedDomains(domains);
    //         });
    //     }
    // }, [editorEngine.state.settingsOpen, domainsManager]);

    function editDomain() {
        setStatus(VerificationStatus.NO_DOMAIN);
        setRecords([]);
    }

    function onDomainInputChange(e: React.ChangeEvent<HTMLInputElement>) {
        const value = e.target.value;
        setDomain(value);
        const { isValid, error } = isApexDomain(value);
        if (!isValid) {
            setError(error);
        } else {
            setError(null);
        }
    }

    function validateDomain(): string | false {
        if (!domain) {
            setError('Domain is required');
            return false;
        }

        try {
            const { isValid, error } = isApexDomain(domain);
            if (!isValid) {
                setError(error);
                return false;
            }

            setError(null);
            const url = new URL(getValidUrl(domain.trim()));
            const hostname = url.hostname.toLowerCase();
            return hostname;
        } catch (err) {
            setError('Invalid domain format');
            return false;
        }
    }

    async function setupDomain() {
        const validDomain = validateDomain();
        if (!validDomain) {
            return;
        }

        setDomain(validDomain);
        setStatus(VerificationStatus.LOADING);
        setError(null);

        if (!projectManager.project) {
            setError('Project not found');
            return;
        }

        // Send verification request to server
        const response = await api.domain.verification.create.mutate({
            domain: validDomain,
            projectId: projectManager.project.id,
        });

        if (!response.verificationCode) {
            setError('Failed to create domain verification');
            setStatus(VerificationStatus.NO_DOMAIN);
            return;
        }

        setStatus(VerificationStatus.VERIFYING);
        const verificationRecord = getVerificationRecord(response.verificationCode);
        const aRecords = getARecords();
        setRecords([verificationRecord, ...aRecords]);
        setError(null);
    }

    async function verifyDomain() {
        setStatus(VerificationStatus.LOADING);
        setError(null);

        if (!projectManager.project) {
            setError('Project not found');
            return;
        }

        const verificationRecord = await api.domain.verification.get.query({
            projectId: projectManager.project.id,
        });

        if (!verificationRecord[0]?.verificationId) {
            setError('Failed to get verification record');
            return;
        }

        const response = await api.domain.verification.verify.mutate({
            verificationId: verificationRecord[0]?.verificationId,
            projectId: projectManager.project.id,
        });

        if (!response) {
            setError('Failed to verify domain');
            setStatus(VerificationStatus.VERIFYING);
            sendAnalytics('verify domain failed', {
                domain: domain,
                error: 'Failed to verify domain',
            });
            return;
        }

        setStatus(VerificationStatus.VERIFIED);
        setError(null);
        addCustomDomain(domain);
        handleDomainVerified();

        sendAnalytics('verify domain success', {
            domain: domain,
        });
    }

    const handleDomainVerified = () => {
        toast.success('Domain verified!', {
            description: 'Your domain is verified and ready to publish.',
        });

        setTimeout(() => {
            editorEngine.state.settingsOpen = false;
            editorEngine.state.publishOpen = true;
        }, 1000);
    };

    const addCustomDomain = (url: string) => {
        if (!domainsManager) {
            setError('Failed to add custom domain');
            return;
        }
        setStatus(VerificationStatus.VERIFIED);
        setDomain(url);
        setError(null);
        handleDomainVerified();
    };

    function removeDomain() {
        sendAnalytics('remove custom domain', {
            domain: domain,
        });
        setStatus(VerificationStatus.NO_DOMAIN);
        setDomain('');
        setRecords([]);
    }

    function getVerificationRecord(verificationCode: string) {
        const verificationRecord: DNSRecord = {
            type: 'TXT',
            host: FRESTYLE_CUSTOM_HOSTNAME,
            value: verificationCode,
        };
        return verificationRecord;
    }

    function getARecords() {
        const aRecords: DNSRecord[] = [];
        const apexRecord: DNSRecord = {
            type: 'A',
            host: '@',
            value: FREESTYLE_IP_ADDRESS,
        };

        const wwwRecord: DNSRecord = {
            type: 'A',
            host: 'www',
            value: FREESTYLE_IP_ADDRESS,
        };

        aRecords.push(apexRecord, wwwRecord);
        return aRecords;
    }

    function renderExistingDomains() {
        if (ownedDomains.length === 0 || status !== VerificationStatus.NO_DOMAIN) {
            return null;
        }
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
    }

    function getInputButtonText() {
        if (status === VerificationStatus.NO_DOMAIN) {
            return 'Setup';
        }

        if (status === VerificationStatus.LOADING) {
            return 'Loading...';
        }

        return 'Edit';
    }

    function renderNoDomainInput() {
        return (
            <div className="space-y-2">
                <div className="flex justify-between items-start gap-2">
                    <div className="w-1/3">
                        <p className="text-regularPlus text-muted-foreground">Custom URL</p>
                        <p className="text-small text-muted-foreground">
                            {`Input your domain  ${
                                status === VerificationStatus.NO_DOMAIN && ownedDomains.length > 0
                                    ? 'or use previous'
                                    : ''
                            }`}
                        </p>
                    </div>
                    <div className="flex flex-col gap-4 flex-1">
                        <div className="flex gap-2">
                            <Input
                                disabled={status !== VerificationStatus.NO_DOMAIN}
                                value={domain}
                                onChange={onDomainInputChange}
                                placeholder="example.com"
                                className="bg-background placeholder:text-muted-foreground"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        setupDomain();
                                    }
                                }}
                            />
                            <Button
                                onClick={() => {
                                    if (status === VerificationStatus.NO_DOMAIN) {
                                        setupDomain();
                                    } else {
                                        editDomain();
                                    }
                                }}
                                variant="secondary"
                                size="sm"
                                className="h-9 text-smallPlus"
                                disabled={status === VerificationStatus.LOADING}
                            >
                                {status === VerificationStatus.LOADING && (
                                    <Icons.Shadow className="h-4 w-4 animate-spin mr-2" />
                                )}
                                {getInputButtonText()}
                            </Button>
                        </div>
                        {renderExistingDomains()}
                    </div>
                </div>
            </div>
        );
    }

    function renderConfigureHeader() {
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
                        disabled={status === VerificationStatus.LOADING}
                    >
                        {status === VerificationStatus.LOADING && (
                            <Icons.Shadow className="h-4 w-4 animate-spin mr-2" />
                        )}
                        Verify Setup
                    </Button>
                </div>
            </div>
        );
    }

    function renderVerifiedHeader() {
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
    }

    function renderRecords() {
        if (records.length === 0) {
            return null;
        }
        return (
            <div className="grid grid-cols-7 gap-4 rounded-lg border p-4">
                <div className="text-sm font-medium col-span-1">Type</div>
                <div className="text-sm font-medium col-span-3">Host</div>
                <div className="text-sm font-medium col-span-3">Value</div>

                {records.map((record) => (
                    <>
                        <RecordField value={record.type} className="col-span-1" copyable={false} />
                        <RecordField value={record.host} className="col-span-3" />
                        <RecordField value={record.value} className="col-span-3" />
                    </>
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {renderNoDomainInput()}
            {status === VerificationStatus.VERIFYING && renderConfigureHeader()}
            {status === VerificationStatus.VERIFIED && renderVerifiedHeader()}
            {(status === VerificationStatus.VERIFYING || status === VerificationStatus.VERIFIED) &&
                renderRecords()}
            {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
    );
});
