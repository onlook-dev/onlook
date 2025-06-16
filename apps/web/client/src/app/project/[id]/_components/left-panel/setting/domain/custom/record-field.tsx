import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';
import { useState } from 'react';

export const RecordField = ({
    value,
    className,
    copyable = true,
}: {
    value: string;
    className?: string;
    copyable?: boolean;
}) => {
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
};