import { useProjectsManager } from '@/components/Context';
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
    PENDING = 'pending',
    VERIFIED = 'verified',
}

interface DNSRecord {
    type: 'A' | 'CNAME' | 'TXT';
    host: string;
    value: string;
}

export const Verification = observer(() => {
    const projectsManager = useProjectsManager();
    const [status, setStatus] = useState(VerificationStatus.NO_DOMAIN);
    const [domain, setDomain] = useState('');
    const [records, setRecords] = useState<DNSRecord[]>([]);

    function setupDomain() {
        setStatus(VerificationStatus.PENDING);
        // Send verification request to server

        const verificationRecord = getVerificationRecord();
        const aRecords = getARecords();
        setRecords([verificationRecord, ...aRecords]);
    }

    function verifyDomain() {
        setStatus(VerificationStatus.VERIFIED);
    }

    function removeDomain() {
        setStatus(VerificationStatus.NO_DOMAIN);
        setDomain('');
        setRecords([]);
    }

    function getVerificationRecord() {
        const value = 'example-code-value';
        const verificationRecord: DNSRecord = {
            type: 'TXT',
            host: `_freestyle_custom_hostname.${domain}`,
            value: value,
        };
        return verificationRecord;
    }

    function getARecords() {
        const aRecords: DNSRecord[] = [];
        const apexRecord: DNSRecord = {
            type: 'A',
            host: '@',
            value: '35.235.84.134',
        };

        const wwwRecord: DNSRecord = {
            type: 'A',
            host: 'www',
            value: '35.235.84.134',
        };

        aRecords.push(apexRecord, wwwRecord);
        return aRecords;
    }

    function renderDomainInput() {
        return (
            <div className="space-y-2">
                <div className="flex justify-between items-center gap-2">
                    <div>
                        <p className="text-regularPlus text-muted-foreground">
                            {status === VerificationStatus.NO_DOMAIN
                                ? 'Set up your custom domain'
                                : 'Custom URL'}
                        </p>
                    </div>
                    <Input
                        disabled={status !== VerificationStatus.NO_DOMAIN}
                        value={domain}
                        onChange={(e) => setDomain(e.target.value)}
                        placeholder="Input your domain"
                        className="bg-background w-2/3"
                    />
                    <Button
                        disabled={status !== VerificationStatus.NO_DOMAIN}
                        onClick={setupDomain}
                        variant="secondary"
                        size="sm"
                        className="h-8 text-sm"
                    >
                        Setup
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
                    {status === VerificationStatus.PENDING ? (
                        <Button
                            variant="secondary"
                            size="sm"
                            className="h-8 px-3 text-sm"
                            onClick={verifyDomain}
                        >
                            Verify Setup
                        </Button>
                    ) : (
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
                    )}
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
            {renderDomainInput()}
            {status !== VerificationStatus.NO_DOMAIN && renderConfigureHeader()}
            {status !== VerificationStatus.NO_DOMAIN && renderRecords()}
        </div>
    );

    return status === VerificationStatus.NO_DOMAIN ? (
        <div className="space-y-4">
            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <div>
                        <p className="text-regularPlus text-muted-foreground">Custom URL</p>
                    </div>
                    <Input placeholder="Input your domain" className="bg-background w-2/3" />
                </div>
            </div>
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <div className="space-y-2">
                        <p className="text-regularPlus text-muted-foreground">Configure</p>
                        <p className="text-small text-muted-foreground">
                            Your DNS records must be set up with these values.
                        </p>
                    </div>
                    <Button variant="secondary" size="sm" className="h-8 px-3 text-sm">
                        Verify Setup
                    </Button>
                </div>
            </div>
            <div className="grid grid-cols-3 gap-4 rounded-lg border p-4">
                <div className="text-sm font-medium">Name</div>
                <div className="text-sm font-medium">Type</div>
                <div className="text-sm font-medium">Value</div>

                <p className="text-sm">@</p>
                <p className="text-sm">A</p>
                <p className="text-sm">32.233.32.3</p>

                <p className="text-sm">@</p>
                <p className="text-sm">A</p>
                <p className="text-sm">32.243.32.3</p>

                <p className="text-sm">www</p>
                <p className="text-sm">CNAME</p>
                <p className="text-sm">onlook.live</p>
            </div>
        </div>
    ) : (
        <div className="space-y-4">
            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <div>
                        <p className="text-regularPlus text-muted-foreground">Custom URL</p>
                    </div>
                    <Input value="cookieshop.com" disabled className="bg-muted w-2/3" />
                </div>
            </div>
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <div className="space-y-2">
                        <p className="text-regularPlus text-muted-foreground">Configure</p>
                        <p className="text-small text-muted-foreground">
                            Your DNS records must be set up with these values.
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
                                <DropdownMenuItem className="hover:bg-muted focus:bg-muted cursor-pointer">
                                    <Icons.Reset className="mr-2 h-4 w-4" />
                                    Reconfigure DNS
                                </DropdownMenuItem>
                                <DropdownMenuItem className="hover:bg-destructive/10 focus:bg-destructive/10 text-destructive cursor-pointer">
                                    <Icons.Trash className="mr-2 h-4 w-4" />
                                    Remove Domain
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-3 gap-4 rounded-lg border p-4">
                <div className="text-sm font-medium">Name</div>
                <div className="text-sm font-medium">Type</div>
                <div className="text-sm font-medium">Value</div>

                <p className="text-sm">@</p>
                <p className="text-sm">A</p>
                <p className="text-sm">32.233.32.3</p>

                <p className="text-sm">@</p>
                <p className="text-sm">A</p>
                <p className="text-sm">32.243.32.3</p>

                <p className="text-sm">www</p>
                <p className="text-sm">CNAME</p>
                <p className="text-sm">onlook.live</p>
            </div>
        </div>
    );
});
