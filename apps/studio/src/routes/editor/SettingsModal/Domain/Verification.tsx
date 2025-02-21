import { invokeMainChannel } from '@/lib/utils';
import {
    FREESTYLE_IP_ADDRESS,
    FRESTYLE_CUSTOM_HOSTNAME,
    MainChannels,
} from '@onlook/models/constants';
import type {
    CreateDomainVerificationResponse,
    VerifyDomainResponse,
} from '@onlook/models/hosting';
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
import { useState } from 'react';

enum VerificationStatus {
    NO_DOMAIN = 'no_domain',
    VERIFYING = 'verifying',
    VERIFIED = 'verified',
}

interface DNSRecord {
    type: 'A' | 'CNAME' | 'TXT';
    host: string;
    value: string;
}

export const Verification = observer(() => {
    const [status, setStatus] = useState(VerificationStatus.NO_DOMAIN);
    const [domain, setDomain] = useState('');
    const [records, setRecords] = useState<DNSRecord[]>([]);
    const [error, setError] = useState<string | null>(null);

    function editDomain() {
        setStatus(VerificationStatus.NO_DOMAIN);
        setRecords([]);
    }

    function validateDomain(): string | false {
        if (!domain) {
            setError('Domain is required');
            return false;
        }

        try {
            // Add protocol if missing to make URL parsing work
            let urlString = domain.trim();
            if (!urlString.startsWith('http://') && !urlString.startsWith('https://')) {
                urlString = 'https://' + urlString;
            }

            const url = new URL(urlString);
            const hostname = url.hostname.toLowerCase();

            // Split hostname into parts and ensure only two parts (domain + TLD)
            const parts = hostname.split('.');
            if (parts.length !== 2) {
                setError('Please enter a domain without subdomains (e.g., example.com)');
                return false;
            }

            // Basic domain validation regex for the final format
            const domainRegex = /^[a-z0-9]+(-[a-z0-9]+)*\.[a-z]{2,}$/;
            if (!domainRegex.test(hostname)) {
                setError('Please enter a valid domain name (e.g., example.com)');
                return false;
            }

            setError(null);
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

        // Send verification request to server
        const response: CreateDomainVerificationResponse = await invokeMainChannel(
            MainChannels.CREATE_DOMAIN_VERIFICATION,
            {
                domain: validDomain,
            },
        );

        if (!response.success || !response.verificationCode) {
            setError(response.message ?? 'Failed to create domain verification');
            setStatus(VerificationStatus.NO_DOMAIN);
            return;
        }

        setStatus(VerificationStatus.VERIFYING);
        const verificationRecord = getVerificationRecord(validDomain, response.verificationCode);
        const aRecords = getARecords();
        setRecords([verificationRecord, ...aRecords]);
        setError(null);
    }

    async function verifyDomain() {
        const response: VerifyDomainResponse = await invokeMainChannel(MainChannels.VERIFY_DOMAIN, {
            domain: domain,
        });

        if (!response.success) {
            setError(response.message ?? 'Failed to verify domain');
            return;
        }

        setStatus(VerificationStatus.VERIFIED);
        setError(null);
    }

    function removeDomain() {
        setStatus(VerificationStatus.NO_DOMAIN);
        setDomain('');
        setRecords([]);
    }

    function getVerificationRecord(domain: string, verificationCode: string) {
        const verificationRecord: DNSRecord = {
            type: 'TXT',
            host: `${FRESTYLE_CUSTOM_HOSTNAME}.${domain}`,
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

    function renderNoDomainInput() {
        return (
            <div className="space-y-2">
                <div className="flex justify-between items-center gap-2">
                    <div>
                        <p className="text-regularPlus text-muted-foreground">Custom URL</p>
                    </div>
                    <Input
                        disabled={status !== VerificationStatus.NO_DOMAIN}
                        value={domain}
                        onChange={(e) => setDomain(e.target.value)}
                        placeholder="Input your domain"
                        className="bg-background w-2/3"
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
                        className="h-8 text-sm"
                    >
                        {status === VerificationStatus.NO_DOMAIN ? 'Setup' : 'Edit'}
                    </Button>
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
                    >
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
                                    className="hover:bg-destructive/10 focus:bg-destructive/10 text-destructive cursor-pointer"
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
        return (
            <div className="grid grid-cols-7 gap-4 rounded-lg border p-4">
                <div className="text-sm font-medium col-span-1">Type</div>
                <div className="text-sm font-medium col-span-3">Host</div>
                <div className="text-sm font-medium col-span-3">Value</div>

                {records.map((record) => (
                    <>
                        <p className="text-sm col-span-1 overflow-auto">{record.type}</p>
                        <p className="text-sm col-span-3 overflow-auto">{record.host}</p>
                        <p className="text-sm col-span-3 overflow-auto">{record.value}</p>
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
            {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
    );
});
