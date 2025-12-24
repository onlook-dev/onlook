import type { VerificationRecord } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { Fragment, useState } from 'react';
import { useDomainVerification } from './use-domain-verification';

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

function RecordField({
    value,
    className,
    copyable = true,
}: {
    value: string;
    className?: string;
    copyable?: boolean;
}) {
    const [copied, setCopied] = useState(false);
    const copyToClipboard = () => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className={cn('text-sm relative group p-1', className)}>
            <p className="pr-6 overflow-auto text-ellipsis">{value}</p>
            {copyable && (
                <Button
                    className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8"
                    variant="ghost"
                    size="icon"
                    onClick={copyToClipboard}
                >
                    {copied ? <Icons.Check /> : <Icons.Copy />}
                </Button>
            )}
        </div>
    );
}
