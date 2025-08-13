import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { toast } from '@onlook/ui/sonner';
import { getValidUrl } from '@onlook/utility';
import Link from 'next/link';
import { useState } from 'react';

export const UrlSection = ({ url, isCopyable, publishError }: { url: string, isCopyable: boolean, publishError?: boolean }) => {
    const [isCopied, setIsCopied] = useState(false);
    
    // Validate and process the URL safely
    let validUrl: string;
    let isValidUrl = false;
    
    try {
        if (!url || typeof url !== 'string') {
            throw new Error('Invalid URL provided');
        }
        
        validUrl = getValidUrl(url);
        // Test if the URL is actually valid by trying to construct a URL object
        new URL(validUrl);
        isValidUrl = true;
    } catch (error) {
        validUrl = url || 'Invalid URL';
        isValidUrl = false;
    }

    const copyUrl = () => {
        if (!isValidUrl) {
            toast.error('Cannot copy invalid URL');
            return;
        }
        
        navigator.clipboard.writeText(validUrl);
        toast.success('Copied to clipboard');
        setIsCopied(true);
        setTimeout(() => {
            setIsCopied(false);
        }, 2000);
    };

    if (publishError) {
        return (
            <div className="flex flex-row items-center justify-between gap-2">
                <Input 
                    className="bg-background-secondary w-full text-xs" 
                    value="Resolve error below to publish..." 
                    readOnly 
                />
            </div>
        );
    }

    return (
        <div className="flex flex-row items-center justify-between gap-2">
            <Input 
                className="bg-background-secondary w-full text-xs" 
                value={url || 'No URL available'} 
                readOnly 
            />
            {isCopyable ? (
                <Button 
                    onClick={copyUrl} 
                    variant="outline" 
                    size="icon"
                    disabled={!isValidUrl}
                >
                    {isCopied ? <Icons.Check className="h-4 w-4" /> : <Icons.Copy className="h-4 w-4" />}
                </Button>
            ) : (
                isValidUrl ? (
                    <Link href={validUrl} target="_blank" className="text-sm">
                        <Button variant="outline" size="icon">
                            <Icons.ExternalLink className="h-4 w-4" />
                        </Button>
                    </Link>
                ) : (
                    <Button variant="outline" size="icon" disabled>
                        <Icons.ExternalLink className="h-4 w-4" />
                    </Button>
                )
            )}
        </div>
    );
};
